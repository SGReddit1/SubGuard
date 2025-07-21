import { Comment, Devvit, MenuItemOnPressEvent, Post, User, SettingScope, ModMailService, useAsync, useState, Subreddit } from '@devvit/public-api';

Devvit.configure({
  redis: true, // Enable access to Redis
  redditAPI: true, // Enable access to Reddit API
});

Devvit.addSettings([
 
  {
    type: 'group',
    label: 'ModMail Notifications',
    helpText: 'Notifications increase ModTeam visibility into SubGuard actions and allows searching ModMail by username for warnings issued.',
    fields: [
      {
        type: 'boolean',
        name: 'Enable',
        label: 'Enable to Receive ModMail Notifications',
        helpText: 'The notification will note the action type (warning/ban), a link to the user, as well as the acted upon content and will say how many warnings they currently have or how long their ban was issued for.',
        scope: 'installation', // or SettingScope.Installation
      },
    ], 
  }, 
  {
    type: 'group',
    label: 'Ban Threshold Settings',
    helpText: 'Decide at how many warnings SubGuard should issue a ban, and for how long',
    fields: [
          {
        type: 'number', 
        name: 'warningThreshold',
        label: 'Threshold for Ban',
        helpText: 'On which warning do you want SubGuard to issue a ban (1 - 11)',
        scope: 'installation', // or SettingScope.Installation
        defaultValue: 3,
        onValidate: (event) => {
          if (event.value! > 11) { return 'Number of Warnings Must not Exceed 11' }
        }
      },
      {
        type: 'number', 
        name: 'banLength',
        label: 'Ban Length (in days)',
        helpText: 'Enter the amount of days the user should be banned, not to exceed 999.',
        defaultValue: 30,
        scope: 'installation', // or SettingScope.Installation
        onValidate: (event) => {
          if (event.value! > 999) { return 'Number of Days Must not Exceed 999' }
        },
      },
    ], 
  }, 
  {
    type: 'group',
    label: 'Custom Comments',
    helpText: 'Clear the fields to revert to default SubGuard comments. All fields support placeholders: {{location}} - returns "post" or "comment" || {{author}} - returns the user name of the post or comment submitter. || {{warnings}} - returns a numerical value of warnings currently issued against that member. || {{threshold}} - returns the number from your threshold for ban setting. || {{length}} - returns the amount of days from your ban length setting',
    fields: [
      {
        type: 'paragraph',
        name: 'RemindComment',
        label: 'Comment & Remind',
        helpText: 'A comment left to remind members of the rules, or that their contribution borders on the edge of rule breaking. No warning is issued',
        defaultValue: 'Please take a moment to familiarize yourself with our rules, this {{location}} almost broke one.',
        scope: 'installation', // or SettingScope.Installation
      },
      {
        type: 'paragraph',
        name: 'LockWarn',
        label: 'Lock & Warn (Warning Issued)',
        helpText: 'Comment left when a warning was issued, but not a ban.',
        defaultValue: 'A warning has been issued for this {{location}}, and a PM has been sent with more details. Please reach out to the MODs with any questions.',
        scope: 'installation', // or SettingScope.Installation
      },

      {
        type: 'paragraph',
        name: 'LockWarnBan',
        label: 'Lock & Warn (Banned)',
        helpText: 'Comment left when this is the final warning and the member has been banned.',
        defaultValue: 'A final warning and has been issued for this {{location}}, and {{author}} has been banned for {{length}} days. A PM has been sent with more details.',
        scope: 'installation', // or SettingScope.Installation
      },
    ], 
  }, 
 
]);


Devvit.addMenuItem({
  label: 'Comment & Remind',
  location: ['post', 'comment'],
  forUserType: 'moderator',
  onPress: commentremind,
});

Devvit.addMenuItem({
  label: 'Lock & Warn',
  location: ['post', 'comment'],
  forUserType: 'moderator',
  onPress: lockandwarn,
});


Devvit.addMenuItem({
  label: 'Delete & Warn',
  location: ['post', 'comment'],
  forUserType: 'moderator',
  onPress: deleteandwarn,
});


Devvit.addMenuItem({
  label: 'Show Warnings',
  location: ['post', 'comment'],
  forUserType: 'moderator',
  onPress: showWarnings,
});

Devvit.addMenuItem({
  label: 'Remove Warning',
  location: ['post', 'comment'],
  forUserType: 'moderator',
  onPress: removeWarning,
});



/**
 * Retrieves a post or comment based on the event location and ID
 */
async function getThing(
  event: MenuItemOnPressEvent,
  context: Devvit.Context
): Promise<Post | Comment> {
  const { location, targetId } = event;
  const { reddit } = context;
  if (location === 'post') {
    return await reddit.getPostById(targetId);
  } else if (location === 'comment') {
    return await reddit.getCommentById(targetId);
  }
  throw 'Cannot find a post or comment with that ID';
}

/**
 * Handles the 'Lock & Warn' action
 */
async function lockandwarn(event: MenuItemOnPressEvent, context: Devvit.Context): Promise<void> {
  const { location } = event;
  const { reddit, ui } = context;
  const thing = await getThing(event, context);
  const author = await getAuthor(event, context);
  const enableModMailNotifications = await context.settings.get('Enable');
  const subreddit = await reddit.getCurrentSubreddit();
  const { permalink } = thing;
  const warningThreshold = Number(await context.settings.get('warningThreshold'));
  const banLength = Number(await context.settings.get('banLength'));

  // Lock the content
  await thing!.lock();

  // Issue a warning to the user and persist it to Redis
  let warnings = await getAuthorWarnings(author, context);
  await setAuthorWarnings(author, ++warnings, context);
  const thresholdMet = ((warnings >= warningThreshold))

    // Create a modnote for the user
    const modNote = await reddit.addModNote({
      subreddit: subreddit.name,
      user: author.username,
      redditId: thing.id,
      label: 'SPAM_WATCH',
      note: `Warning issued for ${location}. ${author.username} now has ${warnings} of ${warningThreshold} Warnings`,
    });
  
  
// Fetch the custom comments from settings
const customComment1 = await context.settings.get('LockWarn') as string | undefined;
const customComment2 = await context.settings.get('LockWarnBan') as string | undefined;

// Default comment templates
const defaultComment1 = 'A warning has been issued for this {{location}}, and a PM has been sent with more details. Please reach out to the MODs with any questions.';
const defaultComment2 = 'A final warning and has been issued for this {{location}}, and {{author}} has been banned for {{length}} days. A PM has been sent with more details.';

// Select appropritate comment to leave if threshold met or else 
const selectedTemplate = thresholdMet 
  ? (customComment2 || defaultComment2)
  : (customComment1 || defaultComment1);

// Replace placeholders with actual values
const finalCommentText = selectedTemplate
  .replace(/{{location}}/g, location)
  .replace(/{{author}}/g, author.username)
  .replace(/{{warnings}}/g, warnings.toString())
  .replace(/{{threshold}}/g, warningThreshold.toString())
  .replace(/{{length}}/g, banLength.toString());

// Submit the comment
const comment = await reddit.submitComment({
  id: event.targetId,
  text: finalCommentText
});

      // Ban Issued PM (has met warning threshold for ban)
      if (thresholdMet) {
        await reddit.sendPrivateMessage({
          to: author.username,
          subject: `Banned from ${subreddit.name} for Warnings`,
          text:  `You have been issued your final warning for the below ${location} that broke a rule in r/${subreddit.name}, and you have been banned for ${banLength} days. Your warnings have been reset to 0 allowing you to return to the community once your ban has ended.'  
          ${permalink}'    
             
             This message was sent by the r/SubGuard app and replies are not monitored. If you have any questions please message the moderators.`,
    })
    } else {
      // Warning Issued PM (has NOT met warning threshold for ban)
      await reddit.sendPrivateMessage({
        to: author.username,
        subject: `Received a warning on ${subreddit.name}`,
        text: `You have been issued a warning for the below ${location} that broke a rule in r/${subreddit.name}.'
         You currently have ${warnings} warning(s). If you receive ${warningThreshold} warnings, you will be banned for ${banLength} days. To avoid further warnings & prevent a ban, please review our rules before interacting again.'  
          ${permalink}'  
            
            This message was sent by the r/SubGuard app and replies are not monitored. If you have any questions please message the moderators.`,
    })}

  if (thresholdMet) {
    await reddit.banUser({
      subredditName: subreddit.name,
      username: author.username,
      duration: banLength,
      reason: 'Received final warning resulting in ban',
    });

    // Clear all user warnings at time of ban
   await setAuthorWarnings(author, 0, context);

   // New ModNote indicating all warnings were removed
  const modNote = await reddit.addModNote({
   subreddit: subreddit.name,
   user: author.username,
   redditId: thing.id,
   label: 'SPAM_WATCH',
   note: `${author.username} has been banned for ${banLength} days, and their warnings have been reset from ${warnings} to 0."`,
 });

  }
  const result = `u/${author.username} warnings: ${warnings}`;

  //Re-Construct Warnings Post Ban
  const updatedwarnings = await getAuthorWarnings(author, context);

  if (enableModMailNotifications) {
    console.log('ModMail notifications enabled');
    if (thresholdMet) {
      const conversationId = await reddit.modMail.createModNotification({
        subject: `Ban issued against ${author.username}`,
        bodyMarkdown: `A Warning has been issued for the following ${location} that has been locked. u/${author.username} has been banned for ${banLength} days and their warnings have been reset from ${warnings} to 0. ${permalink}`,
        subredditId: `${context.subredditId}`,
      });
    } else {
      const conversationId = await reddit.modMail.createModNotification({
        subject: `Warning issued against ${author.username}`,
        bodyMarkdown: `A Warning has been issued for the following ${location} that has been locked. u/${author.username} now has ${warnings} of ${warningThreshold} warning(s) until they're banned for ${banLength} days. ${permalink}`,
        subredditId: `${context.subredditId}`,
      });
    }
  } else {
    console.log('ModMail notifications disabled');
  }

  ui.showToast(result);
}

/**
 * Handles the 'delete and warn' action
 */
async function deleteandwarn(event: MenuItemOnPressEvent, context: Devvit.Context): Promise<void> {
  const { location } = event;
  const { reddit, ui } = context;
  const thing = await getThing(event, context);
  const author = await getAuthor(event, context);
  const enableModMailNotifications = await context.settings.get('Enable');
  const subreddit = await reddit.getCurrentSubreddit();
  const { permalink } = thing;
  const warningThreshold = Number(await context.settings.get('warningThreshold'));
  const banLength = Number(await context.settings.get('banLength'));
  
   // Remove the content
   await thing!.remove();

   
   // Issue a warning to the user and persist it to Redis
  let warnings = await getAuthorWarnings(author, context);
  await setAuthorWarnings(author, ++warnings, context);
  const thresholdMet = ((warnings >= warningThreshold))


   // Create a modnote for the user
   const modNote = await reddit.addModNote({
    subreddit: subreddit.name,
    user: author.username,
    redditId: thing.id,
    label: 'SPAM_WATCH',
    note: `Warning issued for ${location}. ${author.username} now has ${warnings} of ${warningThreshold} Warnings`,
  });


       // Ban Issued PM (has met warning threshold for ban)
      if (thresholdMet) {
        await reddit.sendPrivateMessage({
          to: author.username,
          subject: `Banned from ${subreddit.name} for Warnings`,
          text:  `You have been issued your final warning for the below ${location} that broke a rule in r/${subreddit.name}, and you have been banned for ${banLength} days. Your warnings have been reset to 0 allowing you to return to the community once your ban has ended.'  
           ${permalink}'  
           
           This message was sent by the r/SubGuard app and replies are not monitored. If you have any questions please message the moderators.`,
    })
    } else {
      // Warning Issued PM (has NOT met warning threshold for ban)
      await reddit.sendPrivateMessage({
        to: author.username,
        subject: `Received a warning on ${subreddit.name}`,
        text: `You have been issued a warning for the below ${location} that broke a rule in r/${subreddit.name}. You currently have ${warnings} warning(s). If you receive ${warningThreshold} warnings, you will be banned for ${banLength} days. To avoid further warnings & prevent a ban, please review our rules before interacting again.'  
        ${permalink}'  
        
        This message was sent by the r/SubGuard app and replies are not monitored. If you have any questions please message the moderators.`,
    })}

  if (thresholdMet) {
    await reddit.banUser({
      subredditName: subreddit.name,
      username: author.username,
      duration: banLength,
      reason: 'Received final warning resulting in ban',
    });

    // Clear all user warnings at time of ban
   await setAuthorWarnings(author, 0, context);

   // New ModNote indicating all warnings were removed
  const modNote = await reddit.addModNote({
   subreddit: subreddit.name,
   user: author.username,
   redditId: thing.id,
   label: 'SPAM_WATCH',
   note: `${author.username} has been banned for ${banLength} days, and their warnings have been reset from ${warnings} to 0."`,
 });

  }
  const result = `u/${author.username} warnings: ${warnings}`;

  //Re-Construct Warnings Post Ban
  const updatedwarnings = await getAuthorWarnings(author, context);

  if (enableModMailNotifications) {
    console.log('ModMail notifications enabled');
    if (thresholdMet) {
      const conversationId = await reddit.modMail.createModNotification({
        subject: `Ban issued against ${author.username}`,
        bodyMarkdown: `A Warning has been issued for the following ${location} that has been removed. u/${author.username} has been banned for ${banLength} days and their warnings have been reset from ${warnings} to 0. ${permalink}`,
        subredditId: `${context.subredditId}`,
      });
    } else {
      const conversationId = await reddit.modMail.createModNotification({
        subject: `Warning issued against ${author.username}`,
        bodyMarkdown: `A Warning has been issued for the following ${location} that has been removed. u/${author.username} now has ${warnings} of ${warningThreshold} warning(s) until they're banned for ${banLength} days. ${permalink}`,
        subredditId: `${context.subredditId}`,
      });
    }
  } else {
    console.log('ModMail notifications disabled');
    // Add code to handle disabled state
  }

  ui.showToast(result);
}


async function getAuthor(event: MenuItemOnPressEvent, context: Devvit.Context): Promise<User> {
  const { reddit } = context;
  const thing = await getThing(event, context);
  return await reddit.getUserById(thing.authorId!);
}

/**
 * Creates a Redis key for the author
 */
function getKeyForAuthor(author: User): string {
  return `${author.id}_warnings`;
}

/**
 * Fetch the current warning count for the author
 */
async function getAuthorWarnings(author: User, context: Devvit.Context): Promise<number> {
  const { redis } = context;
  const key = getKeyForAuthor(author);
  return ((await redis.get(key)) || 0) as number;
}

/**
 * Updates the warning counter in Redis
 */
async function setAuthorWarnings(
  author: User,
  warnings: number,
  context: Devvit.Context
): Promise<void> {
  const { redis } = context;
  const key = getKeyForAuthor(author);
  await redis.set(key, warnings.toString());
}

/**
 * Handles the 'show warnings' action
 */
async function showWarnings(event: MenuItemOnPressEvent, context: Devvit.Context): Promise<void> {
  const thing = await getThing(event, context);
  const author = await getAuthor(event, context);
  const warnings = await getAuthorWarnings(author, context);

  context.ui.showToast(`u/${author.username} has ${warnings} warnings.`);
}

/**
 * Handles the 'remove warning' action
 */
async function removeWarning(event: MenuItemOnPressEvent, context: Devvit.Context): Promise<void> {
  const author = await getAuthor(event, context);
  const { ui } = context;
  let warnings = await getAuthorWarnings(author, context);

  if (warnings > 0) {
    await setAuthorWarnings(author, --warnings, context);
    ui.showToast(`Removed a warning from u/${author.username}. Remaining warnings: ${warnings}.`);
    return;
  }

  ui.showToast(`u/${author.username} does not have any warnings!`);
}

/**
 * Handles the Comment & Remind action
 */
async function commentremind(event: MenuItemOnPressEvent, context: Devvit.Context): Promise<void> {
  const { location } = event;
  const { reddit, ui } = context;
  const thing = await getThing(event, context);
  const author = await getAuthor(event, context);
  const placeholder = event;
  const warningThreshold = Number(await context.settings.get('warningThreshold'));
  const banLength = Number(await context.settings.get('banLength'));

  // Fetch the custom comment from settings
const customcomment = await context.settings.get('RemindComment') as string | undefined;

  // Get the number of warnings for the author
  const warnings = await getAuthorWarnings(author, context);

// Use the custom comment if available, otherwise fall back to the default value
const commentText: string = customcomment || 'Please take a moment to familiarize yourself with our rules, this {{location}} almost broke one.';

// Replace {{location}} & {{rules}} with the actual value
const finalCommentText = commentText
.replace(/{{location}}/g, location) // Replace {{location}} with comment or post
.replace(/{{author}}/g, author.username) // Replace {{author}} with the author's username
.replace(/{{warnings}}/g, warnings.toString()) // Replace {{warnings}} with the number of warnings
.replace(/{{threshold}}/g, warningThreshold.toString()) // Replace {{banthreshold}} with the threshold for ban from settings
.replace(/{{length}}/g, banLength.toString()); // Replace {{length}} with the amount of days the ban lasts from settings  


// Construct comment from comment options
const commentOptions = {
  id: event.targetId,
  text: finalCommentText, // Use `finalCommentText` instead of `commentText`
};

// Submit a comment reply to the user
const comment = await reddit.submitComment(commentOptions);
 
  
  
  ui.showToast(`Comment Posted`)}

  /**
   * Adds Menu Item and Functionality to Show any User Their Warnings 
   */

  Devvit.addMenuItem({
    label: 'Check my Warnings (SubGuard)',
    location: ['subreddit'],
    onPress: async function showWarnings(event: MenuItemOnPressEvent, context: Devvit.Context): Promise<void> {
      const username = await context.reddit.getCurrentUser()
      
      
      if (!username) {
        context.ui.showToast("You need to be logged in to check your warnings.");
        return;
      }
      
      // Get warnings for the current user
      const warnings = await getAuthorWarnings(username, context)
      const warningThreshold = Number(await context.settings.get('warningThreshold'))
      const banLength = Number(await context.settings.get('banLength'));
      
      context.ui.showToast(`You have ${warnings} warning(s) in this Community || Bans are issued for ${banLength} days after receiving ${warningThreshold} warning(s).`);
    },
  });

  

    
export default Devvit;
SubGuard is an app that issues warnings to members if a Mod uses one of the "Lock & Warn" or "Delete & Warn" menu options against a post or comment that has broken a rule of the subreddit. The app has the capability to ban the member for up to 999 days upon being issued a final warning as determined by the user settings.

Adds the following MOD Menu Items:
Comment & Remind;
Lock & Warn ; 
Delete & Warn ;
Show Warnings ;
Remove Warning ;

Functionality

Comment & Remind: leaves a comment on a post or comment that has been selected by a mod for almost breaking a rule. The comment reminds the member to review the rules of the subreddit. No warnings are issued against the member.

Lock & Warn: locks a comment or post that has been selected by a mod. The app leaves a comment reply & sends a PM notifying the member that they have been issued a warning, how many warnings they currently have and a link to the content. 

Delete & Warn: removes a comment or post that has been selected by a mod. The app will send the user a PM notifying them of the deleted content, that they have been issued a warning, how many warnings they currently have and a link to the content. 

Show Warnings: shows a Mod how many warnings a member has against them.

Remove Warning: removes 1 single warning from the member & displays remaning warnings. 

The app will add a Mod Note to the member with a link to the content, and issue a "Spam Watch" warning label to the user for Mods to easily spot members with active warnings.

When a member is issued a final warning, the app will ban them for the amount of time specified in the app settings. The member gets a ban confirmation PM from the App and Reddit facilitates a more formal ban notice PM from the Subreddit. 

Visit r/SubGuard for screenshots of PM messages sent and "Check my Warnings (SubGuard)" details. 

- An optional installation setting is available to receive ModMail notifications ++ v 0.0.3
- Custom comments may be created in the app installation settings page for Comment & Remind and Lock & Warn ++ v 0.0.4
- Moderators may now decide at how many warnings SubGuard should issue a ban, and for how long the ban should last. Added new functionality that removes all warnings after someone is banned allowing a banned user to return to the group once their ban is over with no warnings, starting the warning process over. ++ v 0.0.5
- Members may now independently check their warnings within your community through the menu item "Check my Warnings (SubGuard)". This displays a UI message with current warnings to the logged in user. ++ v 0.0.6
- Final warning resulting in ban comment field added to settings for Lock&Warn to distinguish a warning from a final warning and prevent conflicting messages. Added a note to the PMs sent to prevent replies to the SubGuard app and direct questions to the subreddit Moderators ++v 0.0.8

# Change Log

## v 0.0.12 - 7/11/25
- User reporting sporatic toast messages upon actions taken, no concerns with functionality. Updating client to resolve 
- updated to Devvit version 11.18, updated app, updated npm and dependencies 
- fully tested, no apparent breaks or new bugs, toast messages appear consistently 

## v 0.0.8 - 5/8/25
- Added a custom comment field to settings when the warning issued is the final warning resulting in a ban
- Updated check my warnings (Subguard) message 
- Updated PM messages sent with an additional level of detail for members 
- Added new placeholders for use with custom comments

## v 0.0.7 - 4/29/25
- Updated App status to public

## v 0.0.6 - 4/25/25
- Added User Menu item "Check my Warnings (SubGuard)"

## v 0.0.5 - 3/7/25
- Updated installation settings page
- Added setting allowing MODs to determine at how many warnings a ban should be issued
- Added setting to customize ban length
- Added functionality that removes all warnings & adds a warning removal confirmation ModNote upon ban

## v 0.0.4 - 3/6/25
- Updated installation settings page
- Added ability to create custom comments

## v 0.0.3 - 2/28/25
- Added installation settings page
- Added optional ModMail Notifications

## v 0.0.2 - 2/6/25
- Updated name in AboutMe
- Fixed issue where Comment & Remind was issuing a warning
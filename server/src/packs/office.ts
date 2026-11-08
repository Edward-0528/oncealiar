import type { WordPack } from '@oncealiar/shared';
import { topic } from './helpers.js';

export const office: WordPack = {
  id: 'office',
  name: 'The Office',
  tagline: 'Per my last lie…',
  emoji: '💼',
  premium: true,
  topics: [
    topic('office-supplies', 'Office Supplies', '📎', ['Stapler', 'Paper Clip', 'Sticky Notes', 'Highlighter', 'Binder', 'Hole Punch', 'Tape Dispenser', 'Rubber Band', 'Whiteboard', 'Envelope', 'Calculator', 'Shredder', 'Printer', 'Lanyard', 'Desk Lamp', 'Swivel Chair']),
    topic('office-meeting-cliches', 'Meeting Clichés', '🗣️', ['Circle Back', 'Synergy', 'Deep Dive', 'Low-Hanging Fruit', 'Touch Base', 'Take It Offline', 'Bandwidth', 'Moving Forward', 'Action Items', 'Ping Me', 'Game Changer', 'Pivot', 'Blue Sky', 'Quick Sync', 'Parking Lot', 'Win-Win']),
    topic('office-coworker-types', 'Coworker Types', '🧑‍💼', ['Office Gossip', 'Micromanager', 'Reply-All Pro', 'Snack Thief', 'Loud Talker', 'Brown-Noser', 'Overachiever', 'Slacker', 'Office Mom', 'Class Clown', 'Fish Microwaver', 'Always Late', 'Know-It-All', 'Close Talker', 'Humble Bragger', 'Intern']),
    topic('office-email-phrases', 'Passive-Aggressive Emails', '📧', ['Per My Last Email', 'As Discussed', 'Friendly Reminder', 'Just Following Up', 'Thanks in Advance', 'Going Forward', 'Hope This Helps', 'Not Sure If Seen', 'Looping In', 'Quick Question', 'Please Advise', 'Bumping This', 'Noted', 'Gentle Nudge', 'Happy to Clarify', "Cc'ing My Boss"]),
    topic('office-late-excuses', 'Late-to-Work Excuses', '⏰', ['Traffic', 'Alarm Failed', 'Flat Tire', 'Sick Kid', 'Train Delay', 'Lost Keys', 'Doctor Visit', 'Overslept', 'Locked Out', 'Power Cut', 'Coffee Line', 'Detour', 'Bad Weather', 'Stuck Elevator', 'Parking Hunt', 'Wardrobe Crisis']),
    topic('office-places', 'Around the Office', '🏢', ['Break Room', 'Conference Room', 'Cubicle', 'Elevator', 'Supply Closet', 'Corner Office', 'Reception', 'Parking Lot', 'Copy Room', 'Server Room', 'Rooftop', 'Water Cooler', 'Mail Room', 'Phone Booth', 'Bathroom', 'Lobby']),
    topic('office-wfh', 'Working From Home', '🏠', ['Pajama Pants', 'Mute Button', 'Camera Off', 'Pet Cameo', 'Doorbell', 'Laundry Break', 'Couch Office', 'Bad Wi-Fi', 'Virtual Background', 'Kid Cameo', 'Frozen Screen', 'Fridge Trips', 'Slippers', 'Midday Nap', 'Mouse Jiggler', "You're on Mute"]),
    topic('office-party', 'Office Party', '🎂', ['Sheet Cake', 'Secret Santa', 'Ugly Sweater', 'Karaoke', 'Name Tags', 'Awkward Toast', 'Boss Dancing', 'Potluck', 'Trivia', 'Raffle', 'Open Bar', 'Team Photo', 'Gift Card', 'Party Hats', 'Birthday Card', 'Leftovers']),
    topic('office-job-titles', 'Job Titles', '🪪', ['CEO', 'Intern', 'Manager', 'Analyst', 'Consultant', 'Accountant', 'Receptionist', 'Designer', 'Engineer', 'Recruiter', 'Assistant', 'Director', 'Supervisor', 'Sales Rep', 'Chief of Staff', 'Developer']),
    topic('office-break-room-snacks', 'Break Room Snacks', '🍩', ['Donuts', 'Bagels', 'Free Pizza', 'Granola Bar', 'Trail Mix', 'Leftover Cake', 'Candy Bowl', 'Pretzels', 'Popcorn', 'Fruit Bowl', 'Instant Noodles', 'Cookies', 'Coffee Pods', 'Yogurt', 'Mystery Tupperware', 'Energy Drink']),
    topic('office-tech-troubles', 'Tech Troubles', '💻', ['Printer Jam', 'Spinning Wheel', 'Forgot Password', 'Dead Battery', 'Wi-Fi Down', 'Forced Update', 'Reply All', 'Lost File', 'Blue Screen', 'No Signal', 'Account Locked', 'Spam Filter', 'Mic Echo', 'App Crash', 'Unsaved Work', 'IT Ticket']),
    topic('office-performance-review', 'Performance Review', '📈', ['Self-Assessment', 'Goals', 'KPIs', 'Raise', 'Promotion', 'Feedback', 'Strengths', 'Growth Areas', 'Bonus', 'Rating', 'Peer Review', 'Improvement Plan', 'Stretch Goal', 'Kudos', 'Career Path', 'One-on-One']),
    topic('office-pranks', 'Office Pranks', '🤡', ['Wrapped Desk', 'Sticky Note Wall', 'Taped Mouse', 'Fake Spider', 'Air Horn', 'Balloon Office', 'Swapped Keyboard', 'Whoopee Cushion', 'Jelly Stapler', 'Fake Memo', 'Glitter Bomb', 'Duck Army', 'Autocorrect Trick', 'Screen Flip', 'Cup Maze', 'Googly Eyes']),
    topic('office-desk-things', 'Things on a Desk', '🖥️', ['Monitor', 'Keyboard', 'Mouse Pad', 'Coffee Mug', 'Plant', 'Family Photo', 'Stress Ball', 'Fidget Toy', 'Headphones', 'Desk Calendar', 'Pen Cup', 'Snack Drawer', 'Phone Charger', 'Water Bottle', 'Hand Sanitizer', 'Nameplate']),
    topic('office-look-busy', 'Ways to Look Busy', '👀', ['Fast Typing', 'Carrying Papers', 'Serious Face', 'Walking Fast', 'Open Spreadsheet', 'Headphones In', 'Fifty Tabs', 'Loud Sighing', 'Taking Notes', 'Back-to-Back', 'Clipboard', 'Pacing Calls', 'Messy Desk', 'Midnight Email', 'Status Green', 'Whiteboard Doodle'])
  ]
};

import type { WordPack } from '@oncealiar/shared';
import { topic } from './helpers.js';

/** Mature: cheeky, suggestive adult party humor. No explicit content, no slurs. */
export const afterDark: WordPack = {
  id: 'after-dark',
  name: 'After Dark',
  tagline: 'For grown-ups who lie for fun. Mostly.',
  emoji: '🌙',
  premium: true,
  mature: true,
  topics: [
    topic('after-dark-date-red-flags', 'Bad Date Red Flags', '🚩', ['Rude to Waiter', 'Talks About Ex', 'Always on Phone', 'Shows Up Late', 'Forgot Wallet', "Mama's Boy", 'Love Bombing', 'Crypto Talk', 'Bad Breath', 'Brought a Friend', 'Orders for You', 'Asks No Questions', 'Old Photos', 'Drunk by 8', 'Pyramid Scheme', 'Still Married']),
    topic('after-dark-hangover-cures', 'Hangover Cures', '🥴', ['Greasy Breakfast', 'Water', 'Electrolytes', 'Coffee', 'Painkillers', 'Nap', 'Hair of the Dog', 'Pickle Juice', 'Burger', 'Cold Shower', 'Sports Drink', 'Pho', 'Banana', 'Sunglasses', 'Blackout Curtains', 'Regret']),
    topic('after-dark-hide-from-parents', 'Things You Hide From Your Parents', '🙈', ['Tattoo', 'Credit Card Bill', 'Speeding Ticket', 'Report Card', 'Lighter', 'Hickey', 'Dating App', 'Bar Tab', 'Party Photos', 'Piercing', 'Secret Boyfriend', 'Fake ID', 'Browser History', 'Hangover', 'Bank Balance', 'Wine Stash']),
    topic('after-dark-morning-after', 'The Morning After', '🌅', ['Walk of Shame', 'Smudged Makeup', 'Lost Shoe', 'Mystery Bruise', 'Drunk Texts', 'Missing Phone', 'Strange Couch', 'Cab Receipt', 'Kebab Wrapper', 'Group Chat Recap', 'Hand Stamp', 'Cold Pizza', 'Blurry Photos', 'Unknown Number', 'New Tattoo', 'Pounding Headache']),
    topic('after-dark-dating-app-cliches', 'Dating App Clichés', '📲', ['Fish Photo', 'Gym Selfie', 'Travel Lover', 'Foodie', 'Dog Dad', 'Fluent Sarcasm', 'Six Foot', 'Partner in Crime', 'Group Photo', 'Sunset Pic', 'Wanderlust', 'Just Looking', 'Binge Watcher', 'Pizza Opinion', 'Gym Rat', 'Hiking Pic']),
    topic('after-dark-bar-crawl', 'Bar Crawl', '🍻', ['Shots', 'Bouncer', 'Last Call', 'Jukebox', 'Karaoke', 'Wingman', 'Tequila', 'Pool Table', 'Dance Floor', 'Cover Charge', 'Happy Hour', 'Bartender', 'Darts', 'Drunk Food', 'Taxi Line', 'Beer Pong']),
    topic('after-dark-cocktails', 'Cocktails', '🍸', ['Margarita', 'Mojito', 'Martini', 'Cosmopolitan', 'Piña Colada', 'Old Fashioned', 'Daiquiri', 'Negroni', 'Bloody Mary', 'Mai Tai', 'Espresso Martini', 'Long Island', 'Moscow Mule', 'Sex on the Beach', 'Manhattan', 'Sangria']),
    topic('after-dark-flirting-moves', 'Flirting Moves', '😏', ['Wink', 'Hair Flip', 'Lip Bite', 'Slow Dance', 'Eye Contact', 'Compliment', 'Buy a Drink', 'Arm Touch', 'Pickup Line', 'Smolder', 'Lean In', 'Inside Joke', 'Playful Tease', 'Late Night Text', 'Laugh Too Hard', 'Steal a Fry']),
    topic('after-dark-awkward-encounters', 'Awkward Encounters', '😬', ['Bumping Into Ex', 'Wrong Name', 'Reply All', 'Old Photo Like', 'Thin Walls', 'Open Fly', 'Wrong Wave', 'Sent to Mom', 'Butt Dial', 'Food in Teeth', 'Hug or Handshake', 'Toilet Clog', 'Parents Walk In', 'Elevator Fart', 'Awkward Silence', 'Loud Neighbors']),
    topic('after-dark-guilty-pleasures', 'Guilty Pleasures', '🫣', ['Reality TV', 'Boy Band Songs', 'Romance Novels', 'Fast Food', 'Online Shopping', 'Ex Stalking', 'Bubble Baths', 'Skipping Gym', 'Midnight Snacks', 'Celebrity Gossip', 'Soap Operas', 'Napping', 'Cheesy Movies', 'Sweatpants Day', 'Horoscopes', 'Fan Fiction']),
    topic('after-dark-bachelorette', 'Bachelorette Party', '👰', ['Sash', 'Tiara', 'Limo', 'Cheeky Straws', 'Hired Dancer', 'Dare Cards', 'Matching Shirts', 'Veil', 'Spa Day', 'Vegas', 'Party Bus', 'Bride Squad', 'Lingerie Gift', 'Sing-Along', 'Penalty Shots', 'Brunch']),
    topic('after-dark-white-lies', 'Little White Lies', '🤥', ["I'm Fine", 'On My Way', 'Love the Gift', 'Just One Drink', 'I Read It', 'Phone Died', 'Never Again', 'Almost Done', 'Nice Haircut', 'Busy That Night', 'Delicious!', 'Already Ate', 'Not Jealous', 'Only Had Two', "It's Not You", 'Sick Day']),
    topic('after-dark-3am', 'Things That Happen at 3AM', '🕒', ['Drunk Dial', 'Kebab Run', 'Deep Talks', 'Existential Crisis', 'U Up Text', 'Online Shopping', 'Cereal', 'Rabbit Hole', 'Afterparty', 'Surge Pricing', 'Fridge Raid', 'Insomnia', 'Bad Tattoo Idea', 'Lost Keys', 'Ghost Noises', 'Fire Alarm']),
    topic('after-dark-roommate-nightmares', 'Roommate Nightmares', '🛋️', ['Dirty Dishes', 'Loud Music', 'Overnight Guests', 'Stolen Food', 'Late Rent', 'Hair in Drain', 'Passive Notes', 'Thermostat War', 'Never Cleans', 'Borrowed Clothes', 'Bathroom Hog', 'Weird Smells', 'Secret Pet', 'Thin Walls', 'Loud Bedroom', 'Uninvited Party']),
    topic('after-dark-breakup-excuses', 'Breakup Excuses', '💔', ["It's Not You", 'Need Space', 'Moving Away', 'Focus on Me', 'Too Busy', 'Not Ready', 'Found Someone', 'Grew Apart', 'Different Goals', 'Bad Timing', 'Allergic to Cat', 'Hate Your Friends', 'Snoring', 'Chews Loudly', 'Want to Travel', 'Back With Ex'])
  ]
};

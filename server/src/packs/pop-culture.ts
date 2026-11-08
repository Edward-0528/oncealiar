import type { WordPack } from '@oncealiar/shared';
import { topic } from './helpers.js';

export const popCulture: WordPack = {
  id: 'pop-culture',
  name: 'Pop Culture',
  tagline: 'You definitely saw it. You just can’t say it.',
  emoji: '📺',
  premium: true,
  topics: [
    topic('pop-movie-villains', 'Movie Villain Types', '🦹', ['Evil Twin', 'Mad Scientist', 'Dark Lord', 'Corrupt Mayor', 'Evil Stepmother', 'Robot Overlord', 'Crime Boss', 'Masked Slasher', 'Rogue AI', 'Sorceress', 'Alien Invader', 'Bully', 'Jealous Rival', 'Henchman', 'Cult Leader', 'Greedy CEO']),
    topic('pop-reality-tv', 'Reality TV Moments', '📺', ['Final Rose', 'Confessional', 'Table Flip', 'Elimination', 'Blindside', 'Reunion Show', 'Dramatic Exit', 'Villain Edit', 'Screaming Match', 'Makeover Reveal', 'Tearful Goodbye', 'Love Triangle', 'Drink Toss', 'Immunity Win', 'Cliffhanger', 'Hot Tub Drama']),
    topic('pop-viral-internet', 'Viral Internet Things', '📱', ['Meme', 'Cat Video', 'Unboxing', 'Dance Challenge', 'Prank Video', 'Mukbang', 'ASMR', 'Life Hack', 'Reaction Video', 'Rickroll', 'Fail Compilation', 'Hot Take', 'Thirst Trap', 'Ratio', 'Copypasta', 'Livestream']),
    topic('pop-movie-tropes', 'Movie Tropes', '🎞️', ['Chosen One', 'Training Montage', 'Slow-Mo Walk', 'Plot Twist', 'Jump Scare', 'Final Girl', 'Meet Cute', 'Airport Chase', 'Body Swap', 'Time Loop', 'Mentor Dies', 'Fake Dating', 'Car Chase', 'Enemies to Lovers', 'Dream Sequence', 'Post-Credit Scene']),
    topic('pop-award-shows', 'Award Show Moments', '🏆', ['Red Carpet', 'Acceptance Speech', 'Wrong Envelope', 'Standing Ovation', 'Wardrobe Mishap', 'Play-Off Music', 'Snub', 'Host Monologue', 'Group Selfie', 'Upset Win', 'Tearful Thanks', 'Trophy Drop', 'Stage Trip', 'In Memoriam', 'Surprise Duet', 'Afterparty']),
    topic('pop-superhero-staples', 'Superhero Movie Staples', '🦸‍♂️', ['Origin Story', 'Secret Identity', 'Cape', 'Sidekick', 'Secret Lair', 'Utility Belt', 'Team-Up', 'Mask', 'Arch-Nemesis', 'Cameo', 'Multiverse', 'Catchphrase', 'City Destruction', 'Love Interest', 'Power Suit', 'Mentor']),
    topic('pop-pop-star-life', 'Pop Star Life', '🎤', ['World Tour', 'Fan Club', 'Paparazzi', 'Comeback', 'Music Video', 'Diva Moment', 'Stage Dive', 'Autotune', 'Lip Sync', 'Wardrobe Change', 'Fireworks', 'Backstage Pass', 'Encore', 'Fan Signs', 'Collab', 'Breakup Song']),
    topic('pop-sitcom-characters', 'Sitcom Characters', '🛋️', ['Nosy Neighbor', 'Clueless Dad', 'Wisecracking Kid', 'Sarcastic Teen', 'Lovable Slacker', 'Neat Freak', 'Airhead', 'Grumpy Grandpa', 'Overbearing Mom', 'Weird Uncle', 'Nerd', 'Mean Boss', 'Freeloader', 'Jock', 'Talking Pet', 'Will-They Couple']),
    topic('pop-binge-watching', 'Binge-Watching', '🍿', ['Skip Intro', 'Autoplay', 'Cliffhanger', 'Spoilers', 'Next Episode', 'Watchlist', 'Shared Password', 'Rewatch', 'Subtitles', 'Falling Asleep', 'Season Finale', 'Cancelled Show', 'Background TV', 'Trailer', 'Snack Run', 'Still Watching?']),
    topic('pop-talent-show-acts', 'Talent Show Acts', '🎪', ['Magician', 'Juggler', 'Ventriloquist', 'Stand-Up', 'Fire Eater', 'Contortionist', 'Beatboxer', 'Yodeler', 'Mime', 'Tap Dancer', 'Opera Singer', 'Dog Act', 'Acrobat', 'Impressionist', 'Plate Spinner', 'Hypnotist']),
    topic('pop-horror-mistakes', 'Horror Movie Mistakes', '👻', ['Splitting Up', 'Going Upstairs', "Who's There?", 'Reading the Curse', 'Opening the Door', 'Dead Phone', 'Stalled Car', 'Spirit Board', 'Taking a Shortcut', 'Hitchhiking', 'Be Right Back', 'Tripping', 'Hiding in Closet', 'Skinny Dipping', 'Buying the House', 'Looking Back']),
    topic('pop-game-shows', 'Game Show Things', '🎰', ['Buzzer', 'Big Wheel', 'Lifeline', 'Final Round', 'Jackpot', 'Host', 'Studio Audience', 'Lightning Round', 'Grand Prize', 'Mystery Box', 'Wrong Answer', 'Sudden Death', 'Double Points', 'Showcase', 'Applause Sign', 'Contestant']),
    topic('pop-rom-com-moments', 'Rom-Com Moments', '💘', ['Meet Cute', 'Airport Dash', 'Makeover', 'Grand Gesture', 'Rain Kiss', 'Boombox Serenade', 'Fake Dating', 'Best Friend Talk', 'Wedding Crash', 'Misunderstanding', 'Slow Dance', 'The Bet', 'Love Letter', 'Ex Returns', 'Shopping Montage', 'Happily Ever After']),
    topic('pop-social-media', 'Social Media', '📸', ['Selfie', 'Hashtag', 'Story', 'Filter', 'Influencer', 'Follower', 'Like', 'Comment', 'Repost', 'Block', 'Unfollow', 'Caption', 'DM', 'Algorithm', 'Blue Check', 'Bio']),
    topic('pop-tv-show-types', 'TV Show Types', '📡', ['Sitcom', 'Soap Opera', 'Cooking Show', 'Game Show', 'Talk Show', 'Dating Show', 'True Crime', 'Nature Doc', 'Cartoon', 'Courtroom', 'Medical Drama', 'Cop Show', 'Home Makeover', 'News', 'Sketch Comedy', 'Baking Contest']),
    topic('pop-fandom', 'Fandom', '🙌', ['Cosplay', 'Fan Fiction', 'Convention', 'Autograph', 'Merch', 'Fan Theory', 'Shipping', 'Midnight Premiere', 'Collector', 'Poster', 'Fan Art', 'Superfan', 'Stan', 'Easter Egg', 'Lore', 'Canon']),
    topic('pop-action-movies', 'Action Movie Staples', '💥', ['Explosion', 'Car Chase', 'One-Liner', 'Sunglasses', 'Rooftop Fight', 'Bomb Timer', 'Helicopter', 'Double Agent', 'Bullet Time', 'Hero Walk', 'Mission Briefing', 'Vault Heist', 'Disguise', 'Parkour', 'Sidekick', 'Motorcycle Jump']),
    topic('pop-iconic-hairstyles', 'Iconic Hairstyles', '💇', ['Mullet', 'Mohawk', 'Afro', 'Bob', 'Pixie Cut', 'Beehive', 'Buzz Cut', 'Man Bun', 'Dreadlocks', 'Pompadour', 'Cornrows', 'Bowl Cut', 'Perm', 'Ponytail', 'Braids', 'Bald']),
    topic('pop-influencer-content', 'Influencer Content', '🤳', ['Haul', 'Get Ready With Me', 'Day in My Life', 'Morning Routine', 'What I Eat', 'Room Tour', 'Storytime', 'Tutorial', 'Q&A', 'Apology Video', 'Vlog', 'Giveaway', 'Try-On', 'Taste Test', 'Challenge', 'Collab']),
    topic('pop-movie-settings', 'Movie Settings', '🎥', ['Haunted House', 'Space Station', 'Desert Island', 'High School', 'Small Town', 'Pirate Ship', 'Castle', 'Prison', 'Casino', 'Jungle', 'Submarine', 'Wasteland', 'Summer Camp', 'Wild West', 'Shopping Mall', 'Cruise Ship'])
  ]
};

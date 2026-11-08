import type { WordPack } from '@oncealiar/shared';
import { topic } from './helpers.js';

export const party: WordPack = {
  id: 'party',
  name: 'House Party',
  tagline: 'Turn it up. Trust no one.',
  emoji: '🪩',
  premium: false,
  topics: [
    topic('party-games', 'Party Games', '🎲', ['Charades', 'Musical Chairs', 'Truth or Dare', 'Limbo', 'Spin the Bottle', 'Telephone', 'Hide and Seek', 'Never Have I Ever', 'Would You Rather', 'Two Truths', 'Hot Potato', 'Simon Says', 'Scavenger Hunt', 'Sardines', 'Murder Mystery', 'Freeze Dance']),
    topic('party-drinks', 'Party Drinks', '🥤', ['Punch', 'Lemonade', 'Cola', 'Ginger Ale', 'Iced Tea', 'Mocktail', 'Smoothie', 'Root Beer', 'Energy Drink', 'Sparkling Water', 'Cream Soda', 'Shirley Temple', 'Milkshake', 'Slushie', 'Kombucha', 'Hot Cider']),
    topic('party-music-genres', 'Music Genres', '🎵', ['Rock', 'Pop', 'Jazz', 'Hip-Hop', 'Country', 'Reggae', 'Disco', 'Metal', 'Punk', 'Blues', 'Techno', 'Salsa', 'Funk', 'R&B', 'K-Pop', 'Classical']),
    topic('party-dance-moves', 'Dance Moves', '💃', ['Floss', 'Moonwalk', 'Robot', 'Worm', 'Twist', 'Macarena', 'Electric Slide', 'Running Man', 'Sprinkler', 'Dab', 'Cha-Cha Slide', 'Conga Line', 'Chicken Dance', 'Shopping Cart', 'Cabbage Patch', 'Lawnmower']),
    topic('party-snacks', 'Party Snacks', '🍿', ['Chips', 'Salsa', 'Guacamole', 'Popcorn', 'Pretzels', 'Nachos', 'Pizza Rolls', 'Wings', 'Sliders', 'Veggie Tray', 'Cheese Board', 'Meatballs', 'Pigs in a Blanket', 'Deviled Eggs', 'Spinach Dip', 'Mini Tacos']),
    topic('party-celebrations', 'Celebrations', '🎊', ['Birthday', 'Wedding', 'Graduation', 'Baby Shower', 'Retirement', 'Anniversary', 'Housewarming', 'Bachelor Party', 'Promotion', 'Engagement', 'Reunion', 'Farewell', 'Gender Reveal', 'Bar Mitzvah', 'Quinceañera', 'Sweet Sixteen']),
    topic('party-karaoke', 'Karaoke Night', '🎤', ['Power Ballad', 'Duet', 'Off-Key', 'Key Change', 'Air Guitar', 'Encore', 'Mic Drop', 'Backup Dancer', 'Wrong Lyrics', 'Big Finish', 'Stage Fright', 'Slow Jam', 'Group Song', 'Falsetto', 'Standing Ovation', 'Song Queue']),
    topic('party-costumes', 'Costume Party', '🎭', ['Pirate', 'Vampire', 'Zombie', 'Ninja', 'Cowboy', 'Astronaut', 'Mummy', 'Werewolf', 'Superhero', 'Clown', 'Robot', 'Witch', 'Ghost', 'Mermaid', 'Dinosaur', 'Hot Dog']),
    topic('party-supplies', 'Party Supplies', '🎈', ['Balloons', 'Streamers', 'Confetti', 'Disco Ball', 'Fog Machine', 'Glow Sticks', 'Paper Plates', 'Red Cups', 'Ice Bucket', 'Speaker', 'Fairy Lights', 'Party Poppers', 'Banner', 'Photo Booth', 'Name Tags', 'Napkins']),
    topic('party-guest-types', 'Party Guest Types', '🥳', ['Life of the Party', 'Wallflower', 'DJ Wannabe', 'Early Bird', 'Fashionably Late', 'Plus-One', 'Snack Hoarder', 'Dance Machine', 'Over-Sharer', 'Photographer', 'Host', 'Party Crasher', 'Selfie Queen', 'Storyteller', 'Ghost', 'Pet Hogger']),
    topic('party-game-night', 'Game Night Things', '🃏', ['Dice', 'Deck of Cards', 'Scorecard', 'Game Board', 'Spinner', 'Tokens', 'Rulebook', 'Sore Loser', 'Hourglass', 'Pawn', 'Trivia', 'Buzzer', 'Tiebreaker', 'House Rules', 'Wild Card', 'Team Captain']),
    topic('party-sleepover', 'Sleepover', '🛏️', ['Pillow Fight', 'Sleeping Bag', 'Pajamas', 'Scary Movie', 'Popcorn', 'Prank Call', 'Face Mask', 'Midnight Snack', 'Blanket Fort', 'Flashlight', 'Gossip', 'Nail Polish', 'Ghost Stories', 'Video Games', 'Truth or Dare', 'Morning Pancakes']),
    topic('party-bbq', 'Backyard BBQ', '🍔', ['Burger', 'Hot Dog', 'Ribs', 'Corn on the Cob', 'Coleslaw', 'Potato Salad', 'Grill', 'Tongs', 'Ketchup', 'Mustard', 'Kebab', 'Watermelon', 'Lawn Chair', 'Cooler', 'Apron', 'Charcoal']),
    topic('party-pool-party', 'Pool Party', '🏊', ['Cannonball', 'Pool Noodle', 'Floatie', 'Sunscreen', 'Beach Ball', 'Diving Board', 'Water Slide', 'Goggles', 'Towel', 'Flip-Flops', 'Inflatable', 'Marco Polo', 'Belly Flop', 'Lifeguard', 'Splash', 'Sunglasses']),
    topic('party-themes', 'Party Themes', '🌴', ['Luau', 'Toga', 'Masquerade', 'Disco', 'Casino Night', 'Roaring 20s', 'Pajama Party', 'Neon', '80s Night', 'Western', 'Hollywood', 'Tropical', 'Pirate', 'Space', 'Black & White', 'Ugly Sweater'])
  ]
};

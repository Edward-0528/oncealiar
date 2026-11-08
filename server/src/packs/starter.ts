import type { WordPack } from '@oncealiar/shared';
import { topic } from './helpers.js';

export const starter: WordPack = {
  id: 'starter',
  name: 'Starter Pack',
  tagline: 'Everything you know. Nothing you can prove.',
  emoji: '🎲',
  premium: false,
  topics: [
    topic('starter-pizza-toppings', 'Pizza Toppings', '🍕', ['Pepperoni', 'Mushrooms', 'Olives', 'Pineapple', 'Ham', 'Sausage', 'Bacon', 'Onions', 'Peppers', 'Spinach', 'Anchovies', 'Jalapeños', 'Tomatoes', 'Chicken', 'Extra Cheese', 'Basil']),
    topic('starter-farm-animals', 'Farm Animals', '🐄', ['Cow', 'Pig', 'Sheep', 'Goat', 'Horse', 'Chicken', 'Duck', 'Turkey', 'Donkey', 'Rooster', 'Llama', 'Goose', 'Rabbit', 'Alpaca', 'Ox', 'Mule']),
    topic('starter-zoo-animals', 'Zoo Animals', '🦁', ['Lion', 'Tiger', 'Elephant', 'Giraffe', 'Zebra', 'Hippo', 'Rhino', 'Gorilla', 'Penguin', 'Kangaroo', 'Panda', 'Flamingo', 'Cheetah', 'Koala', 'Crocodile', 'Polar Bear']),
    topic('starter-jobs', 'Jobs', '👩‍⚕️', ['Doctor', 'Teacher', 'Firefighter', 'Chef', 'Pilot', 'Farmer', 'Dentist', 'Plumber', 'Lawyer', 'Nurse', 'Mechanic', 'Artist', 'Scientist', 'Police Officer', 'Astronaut', 'Librarian']),
    topic('starter-movie-genres', 'Movie Genres', '🎬', ['Horror', 'Comedy', 'Romance', 'Action', 'Western', 'Musical', 'Sci-Fi', 'Fantasy', 'Thriller', 'Mystery', 'Documentary', 'Animation', 'War', 'Superhero', 'Disaster', 'Heist']),
    topic('starter-sports', 'Sports', '⚽', ['Soccer', 'Basketball', 'Tennis', 'Golf', 'Baseball', 'Hockey', 'Rugby', 'Volleyball', 'Boxing', 'Swimming', 'Cricket', 'Bowling', 'Skiing', 'Surfing', 'Wrestling', 'Badminton']),
    topic('starter-household-items', 'Household Items', '🏠', ['Toaster', 'Vacuum', 'Lamp', 'Pillow', 'Mirror', 'Broom', 'Kettle', 'Remote', 'Blender', 'Doormat', 'Curtains', 'Fridge', 'Iron', 'Clock', 'Rug', 'Bookshelf']),
    topic('starter-holidays', 'Holidays', '🎉', ['Christmas', 'Halloween', 'Easter', 'Thanksgiving', "New Year's Eve", "Valentine's Day", 'Hanukkah', 'Diwali', 'Eid', "St. Patrick's Day", "Mother's Day", "Father's Day", 'Lunar New Year', 'Fourth of July', 'Kwanzaa', 'April Fools']),
    topic('starter-school', 'School Life', '🏫', ['Homework', 'Recess', 'Lunchbox', 'Backpack', 'Locker', 'Pencil', 'Eraser', 'Ruler', 'Chalkboard', 'Field Trip', 'Detention', 'Report Card', 'Gym Class', 'Principal', 'Spelling Bee', 'Yearbook']),
    topic('starter-transport', 'Ways to Travel', '🚗', ['Car', 'Bus', 'Train', 'Bicycle', 'Airplane', 'Helicopter', 'Boat', 'Subway', 'Taxi', 'Motorcycle', 'Scooter', 'Tram', 'Ferry', 'Skateboard', 'Hot Air Balloon', 'Rocket']),
    topic('starter-weather', 'Weather', '🌦️', ['Rain', 'Snow', 'Hail', 'Fog', 'Thunder', 'Lightning', 'Tornado', 'Hurricane', 'Rainbow', 'Drizzle', 'Blizzard', 'Heatwave', 'Sleet', 'Breeze', 'Frost', 'Drought']),
    topic('starter-instruments', 'Musical Instruments', '🎸', ['Guitar', 'Piano', 'Drums', 'Violin', 'Trumpet', 'Flute', 'Saxophone', 'Cello', 'Harp', 'Clarinet', 'Trombone', 'Ukulele', 'Banjo', 'Accordion', 'Tuba', 'Harmonica']),
    topic('starter-desserts', 'Desserts', '🍰', ['Cheesecake', 'Brownie', 'Ice Cream', 'Apple Pie', 'Cupcake', 'Tiramisu', 'Donut', 'Pudding', 'Cookie', 'Macaron', 'Churros', 'Crème Brûlée', 'Sundae', 'Fudge', 'Cobbler', 'Mousse']),
    topic('starter-superpowers', 'Superpowers', '🦸', ['Flying', 'Invisibility', 'Super Strength', 'Telepathy', 'Time Travel', 'Teleportation', 'Super Speed', 'X-Ray Vision', 'Shapeshifting', 'Healing', 'Mind Control', 'Laser Eyes', 'Freeze Breath', 'Immortality', 'Talk to Animals', 'Weather Control']),
    topic('starter-breakfast', 'Breakfast Foods', '🥞', ['Pancakes', 'Waffles', 'Bacon', 'Eggs', 'Cereal', 'Oatmeal', 'Toast', 'Bagel', 'Croissant', 'Yogurt', 'French Toast', 'Hash Browns', 'Omelette', 'Muffin', 'Sausage', 'Granola']),
    topic('starter-fruits', 'Fruits', '🍓', ['Apple', 'Banana', 'Orange', 'Strawberry', 'Grape', 'Mango', 'Pineapple', 'Watermelon', 'Cherry', 'Peach', 'Pear', 'Kiwi', 'Lemon', 'Blueberry', 'Coconut', 'Plum']),
    topic('starter-vegetables', 'Vegetables', '🥦', ['Carrot', 'Broccoli', 'Potato', 'Tomato', 'Cucumber', 'Lettuce', 'Onion', 'Corn', 'Peas', 'Spinach', 'Pumpkin', 'Celery', 'Cabbage', 'Eggplant', 'Zucchini', 'Cauliflower']),
    topic('starter-ocean-creatures', 'Ocean Creatures', '🐙', ['Shark', 'Dolphin', 'Whale', 'Octopus', 'Jellyfish', 'Starfish', 'Crab', 'Lobster', 'Seahorse', 'Squid', 'Turtle', 'Stingray', 'Clownfish', 'Seal', 'Eel', 'Walrus']),
    topic('starter-kitchen-tools', 'Kitchen Tools', '🍳', ['Spatula', 'Whisk', 'Ladle', 'Colander', 'Grater', 'Rolling Pin', 'Tongs', 'Peeler', 'Frying Pan', 'Can Opener', 'Cutting Board', 'Measuring Cup', 'Oven Mitt', 'Saucepan', 'Corkscrew', 'Kitchen Timer']),
    topic('starter-places-in-town', 'Places in Town', '🏙️', ['Library', 'Hospital', 'Bakery', 'Bank', 'Post Office', 'Park', 'Museum', 'Cinema', 'Gym', 'Supermarket', 'Fire Station', 'Café', 'Pharmacy', 'Hair Salon', 'Gas Station', 'Playground']),
    topic('starter-vacation-spots', 'Vacation Spots', '🏖️', ['Beach', 'Mountains', 'Cruise Ship', 'Theme Park', 'Campsite', 'Ski Resort', 'Desert', 'Jungle', 'Island', 'Lake House', 'Big City', 'Safari', 'Countryside', 'Hot Springs', 'Cabin', 'Road Trip']),
    topic('starter-clothing', 'Clothing', '👕', ['T-Shirt', 'Jeans', 'Sweater', 'Hoodie', 'Dress', 'Skirt', 'Shorts', 'Jacket', 'Scarf', 'Socks', 'Pajamas', 'Raincoat', 'Overalls', 'Tuxedo', 'Swimsuit', 'Leggings']),
    topic('starter-birthday-party', 'Birthday Party', '🎂', ['Cake', 'Candles', 'Balloons', 'Presents', 'Party Hats', 'Piñata', 'Streamers', 'Goodie Bags', 'Clown', 'Bounce House', 'Confetti', 'Wrapping Paper', 'Cards', 'Magician', 'Ice Cream', 'Party Games']),
    topic('starter-body-parts', 'Body Parts', '🦵', ['Elbow', 'Knee', 'Ankle', 'Shoulder', 'Wrist', 'Eyebrow', 'Chin', 'Nose', 'Ear', 'Toe', 'Thumb', 'Belly Button', 'Neck', 'Heel', 'Forehead', 'Knuckle']),
    topic('starter-colors', 'Colors', '🎨', ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Brown', 'Black', 'White', 'Gray', 'Turquoise', 'Maroon', 'Gold', 'Silver', 'Beige']),
    topic('starter-feelings', 'Feelings', '😊', ['Happy', 'Sad', 'Angry', 'Scared', 'Excited', 'Bored', 'Nervous', 'Jealous', 'Proud', 'Embarrassed', 'Confused', 'Lonely', 'Grateful', 'Surprised', 'Tired', 'Hopeful']),
    topic('starter-fairy-tales', 'Fairy Tale Things', '🏰', ['Castle', 'Dragon', 'Princess', 'Wizard', 'Witch', 'Giant', 'Troll', 'Unicorn', 'Glass Slipper', 'Magic Wand', 'Poison Apple', 'Fairy Godmother', 'Beanstalk', 'Tower', 'Frog Prince', 'Big Bad Wolf']),
    topic('starter-camping', 'Camping', '🏕️', ['Tent', 'Campfire', 'Sleeping Bag', 'Flashlight', 'Marshmallows', 'Compass', 'Lantern', 'Hiking Boots', 'Bug Spray', 'Canoe', 'Backpack', 'Map', 'Cooler', 'Pocketknife', 'Hammock', 'Ghost Stories']),
    topic('starter-space', 'Outer Space', '🚀', ['Moon', 'Sun', 'Mars', 'Saturn', 'Comet', 'Asteroid', 'Black Hole', 'Galaxy', 'Astronaut', 'Rocket', 'Satellite', 'Alien', 'Meteor', 'Telescope', 'Space Station', 'Milky Way']),
    topic('starter-toys', 'Toys', '🧸', ['Yo-Yo', 'Teddy Bear', 'Kite', 'Building Blocks', 'Jump Rope', 'Doll', 'Spinning Top', 'Action Figure', 'Puzzle', 'Marbles', 'Toy Car', 'Rubber Duck', 'Water Gun', 'Rocking Horse', 'Jack-in-the-Box', 'Bubbles'])
  ]
};

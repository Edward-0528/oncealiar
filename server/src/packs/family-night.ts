import type { WordPack } from '@oncealiar/shared';
import { topic } from './helpers.js';

/** Kid-friendly (ages 7+). */
export const familyNight: WordPack = {
  id: 'family-night',
  name: 'Family Night',
  tagline: 'Fibbing is fine tonight. Just tonight.',
  emoji: '👨‍👩‍👧‍👦',
  premium: true,
  topics: [
    topic('family-dinosaurs', 'Dinosaurs', '🦖', ['T-Rex', 'Triceratops', 'Stegosaurus', 'Velociraptor', 'Brontosaurus', 'Pterodactyl', 'Ankylosaurus', 'Spinosaurus', 'Diplodocus', 'Iguanodon', 'Parasaurolophus', 'Allosaurus', 'Brachiosaurus', 'Mosasaurus', 'Dilophosaurus', 'Gallimimus']),
    topic('family-pets', 'Pets', '🐶', ['Dog', 'Cat', 'Hamster', 'Goldfish', 'Parrot', 'Rabbit', 'Guinea Pig', 'Turtle', 'Snake', 'Lizard', 'Ferret', 'Hedgehog', 'Mouse', 'Canary', 'Chinchilla', 'Hermit Crab']),
    topic('family-playground', 'Playground', '🛝', ['Slide', 'Swings', 'Seesaw', 'Monkey Bars', 'Sandbox', 'Merry-Go-Round', 'Jungle Gym', 'Zip Line', 'Tire Swing', 'Hopscotch', 'Tag', 'Tunnel', 'Climbing Wall', 'Spring Rider', 'Balance Beam', 'Water Fountain']),
    topic('family-bedtime', 'Bedtime', '🌙', ['Pajamas', 'Toothbrush', 'Night Light', 'Story Book', 'Teddy Bear', 'Lullaby', 'Blanket', 'Pillow', 'Glass of Water', 'Goodnight Kiss', 'Bubble Bath', 'Monster Check', 'Alarm Clock', 'Slippers', 'Moon', 'Dreams']),
    topic('family-bugs', 'Bugs & Creepy Crawlies', '🐞', ['Ladybug', 'Butterfly', 'Ant', 'Bee', 'Spider', 'Grasshopper', 'Caterpillar', 'Dragonfly', 'Firefly', 'Beetle', 'Worm', 'Snail', 'Mosquito', 'Cricket', 'Moth', 'Centipede']),
    topic('family-magical-creatures', 'Magical Creatures', '🦄', ['Unicorn', 'Dragon', 'Mermaid', 'Fairy', 'Goblin', 'Phoenix', 'Troll', 'Elf', 'Griffin', 'Pegasus', 'Centaur', 'Gnome', 'Yeti', 'Leprechaun', 'Sea Serpent', 'Genie']),
    topic('family-funny-sounds', 'Funny Sounds', '🔊', ['Burp', 'Sneeze', 'Hiccup', 'Giggle', 'Snore', 'Whistle', 'Squeak', 'Boing', 'Splash', 'Pop', 'Honk', 'Moo', 'Buzz', 'Crunch', 'Slurp', 'Gulp']),
    topic('family-backpack', 'In My Backpack', '🎒', ['Lunchbox', 'Pencil Case', 'Water Bottle', 'Notebook', 'Crayons', 'Glue Stick', 'Scissors', 'Homework', 'Folder', 'Snack', 'Calculator', 'Library Book', 'Jacket', 'Permission Slip', 'Ruler', 'Markers']),
    topic('family-ice-cream-flavors', 'Ice Cream Flavors', '🍦', ['Vanilla', 'Chocolate', 'Strawberry', 'Mint Chip', 'Cookie Dough', 'Rocky Road', 'Pistachio', 'Bubblegum', 'Cookies & Cream', 'Butter Pecan', 'Sherbet', 'Coffee', 'Mango', 'Neapolitan', 'Salted Caramel', 'Birthday Cake']),
    topic('family-at-the-beach', 'At the Beach', '🏖️', ['Sandcastle', 'Bucket', 'Shovel', 'Seashell', 'Sunscreen', 'Beach Ball', 'Towel', 'Umbrella', 'Waves', 'Crab', 'Seagull', 'Lifeguard', 'Surfboard', 'Ice Cream', 'Flip-Flops', 'Kite']),
    topic('family-shapes', 'Shapes', '🔷', ['Circle', 'Square', 'Triangle', 'Rectangle', 'Star', 'Heart', 'Oval', 'Diamond', 'Hexagon', 'Pentagon', 'Octagon', 'Crescent', 'Cube', 'Sphere', 'Pyramid', 'Cylinder']),
    topic('family-sports-gear', 'Sports Gear', '⚾', ['Baseball Bat', 'Helmet', 'Soccer Ball', 'Tennis Racket', 'Hockey Stick', 'Goggles', 'Shin Guards', 'Skateboard', 'Jump Rope', 'Golf Club', 'Basketball', 'Whistle', 'Mitt', 'Flying Disc', 'Knee Pads', 'Trophy']),
    topic('family-sticky-things', 'Sticky Things', '🍯', ['Honey', 'Glue', 'Tape', 'Gum', 'Syrup', 'Jam', 'Slime', 'Lollipop', 'Sticker', 'Peanut Butter', 'Caramel', 'Marshmallow', 'Tree Sap', 'Bandage', 'Cotton Candy', 'Sticky Note']),
    topic('family-circus', 'Circus', '🎪', ['Clown', 'Juggler', 'Acrobat', 'Ringmaster', 'Trapeze', 'Tightrope', 'Lion Tamer', 'Unicycle', 'Human Cannonball', 'Popcorn', 'Big Top', 'Stilts', 'Magician', 'Strongman', 'Balloon Animals', 'Fire Hoop']),
    topic('family-chores', 'Chores', '🧹', ['Dishes', 'Laundry', 'Vacuuming', 'Sweeping', 'Dusting', 'Make the Bed', 'Walk the Dog', 'Take Out Trash', 'Feed the Fish', 'Water Plants', 'Mow the Lawn', 'Set the Table', 'Fold Clothes', 'Rake Leaves', 'Clean Room', 'Wash the Car'])
  ]
};

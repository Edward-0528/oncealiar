import type { WordPack } from '@oncealiar/shared';
import { topic } from './helpers.js';

export const aroundTheWorld: WordPack = {
  id: 'around-the-world',
  name: 'Around the World',
  tagline: 'Passport not required. Poker face is.',
  emoji: '🌍',
  premium: true,
  topics: [
    topic('world-big-cities', 'Big Cities', '🌆', ['Paris', 'Tokyo', 'London', 'New York', 'Rome', 'Sydney', 'Cairo', 'Rio', 'Mumbai', 'Bangkok', 'Istanbul', 'Moscow', 'Toronto', 'Dubai', 'Mexico City', 'Berlin']),
    topic('world-european-cities', 'European Cities', '🏰', ['Barcelona', 'Amsterdam', 'Prague', 'Vienna', 'Venice', 'Lisbon', 'Dublin', 'Athens', 'Budapest', 'Copenhagen', 'Edinburgh', 'Florence', 'Munich', 'Stockholm', 'Brussels', 'Krakow']),
    topic('world-cuisines', 'World Cuisines', '🍜', ['Italian', 'Mexican', 'Japanese', 'Chinese', 'Indian', 'Thai', 'French', 'Greek', 'Korean', 'Spanish', 'Vietnamese', 'Lebanese', 'Ethiopian', 'Turkish', 'Brazilian', 'Moroccan']),
    topic('world-landmarks', 'Famous Landmarks', '🗼', ['Eiffel Tower', 'Big Ben', 'Colosseum', 'Taj Mahal', 'Great Wall', 'Pyramids', 'Statue of Liberty', 'Machu Picchu', 'Stonehenge', 'Petra', 'Opera House', 'Golden Gate', 'Mount Rushmore', 'Leaning Tower', 'Angkor Wat', 'Acropolis']),
    topic('world-festivals', 'World Festivals', '🎆', ['Carnival', 'Oktoberfest', 'Diwali', 'Holi', 'Lunar New Year', 'Day of the Dead', 'Mardi Gras', 'Songkran', 'La Tomatina', 'Hanami', 'Bull Run', 'Burning Man', 'Lantern Festival', 'Hogmanay', 'Loy Krathong', 'Midsummer']),
    topic('world-street-food', 'Street Food', '🌮', ['Tacos', 'Falafel', 'Kebab', 'Bao Buns', 'Churros', 'Crêpes', 'Samosa', 'Hot Dog', 'Pad Thai', 'Empanadas', 'Pretzel', 'Arepas', 'Dumplings', 'Gyro', 'Poutine', 'Takoyaki']),
    topic('world-countries', 'Countries', '🗺️', ['Japan', 'Brazil', 'Egypt', 'Canada', 'India', 'Australia', 'Mexico', 'Italy', 'Kenya', 'Norway', 'Peru', 'Thailand', 'Greece', 'Argentina', 'Iceland', 'South Korea']),
    topic('world-islands', 'Islands', '🏝️', ['Hawaii', 'Bali', 'Sicily', 'Jamaica', 'Madagascar', 'Tahiti', 'Santorini', 'Maldives', 'Ibiza', 'Galápagos', 'Greenland', 'Fiji', 'Crete', 'Bermuda', 'Tasmania', 'Mallorca']),
    topic('world-natural-wonders', 'Natural Wonders', '🏔️', ['Grand Canyon', 'Mount Everest', 'Niagara Falls', 'Great Barrier Reef', 'Sahara', 'Northern Lights', 'Victoria Falls', 'Dead Sea', 'Mount Fuji', 'Kilimanjaro', 'Uluru', 'Yellowstone', 'Ha Long Bay', 'Matterhorn', 'Amazon Rainforest', 'Iguazu Falls']),
    topic('world-breakfasts', 'Breakfasts Abroad', '🍳', ['Full English', 'Croissant', 'Congee', 'Shakshuka', 'Chilaquiles', 'Dim Sum', 'Miso Soup', 'Churros', 'Muesli', 'Bagel', 'Huevos Rancheros', 'Idli', 'Waffles', 'Kaya Toast', 'Pancakes', 'Pastel de Nata']),
    topic('world-languages', 'Languages', '🗣️', ['Spanish', 'French', 'Mandarin', 'Arabic', 'Hindi', 'Portuguese', 'Russian', 'Japanese', 'German', 'Italian', 'Swahili', 'Korean', 'Greek', 'Dutch', 'Turkish', 'Hebrew']),
    topic('world-currencies', 'Currencies', '💱', ['Dollar', 'Euro', 'Pound', 'Yen', 'Peso', 'Rupee', 'Franc', 'Yuan', 'Won', 'Ruble', 'Krona', 'Real', 'Rand', 'Dirham', 'Baht', 'Lira']),
    topic('world-dances', 'World Dances', '💃', ['Tango', 'Salsa', 'Flamenco', 'Samba', 'Hula', 'Polka', 'Waltz', 'Bollywood', 'Haka', 'Irish Jig', 'Belly Dance', 'Can-Can', 'Bhangra', 'Merengue', 'Capoeira', 'Cossack Dance']),
    topic('world-desserts', 'Desserts Abroad', '🍮', ['Tiramisu', 'Baklava', 'Mochi', 'Gelato', 'Crème Brûlée', 'Flan', 'Pavlova', 'Gulab Jamun', 'Black Forest Cake', 'Brigadeiro', 'Cannoli', 'Strudel', 'Tres Leches', 'Halo-Halo', 'Lamington', 'Mango Sticky Rice']),
    topic('world-travel-essentials', 'Travel Essentials', '✈️', ['Passport', 'Suitcase', 'Boarding Pass', 'Neck Pillow', 'Sunscreen', 'Plug Adapter', 'Guidebook', 'Camera', 'Phrasebook', 'Map', 'Visa', 'Backpack', 'Souvenir', 'Jet Lag', 'Currency', 'Hotel Key']),
    topic('world-getting-around', 'Getting Around', '🚤', ['Gondola', 'Tuk-Tuk', 'Rickshaw', 'Bullet Train', 'Cable Car', 'Double-Decker', 'Camel', 'Ferry', 'Water Taxi', 'Sleeper Train', 'Junk Boat', 'Jeepney', 'Funicular', 'Dog Sled', 'Moped', 'Hot Air Balloon']),
    topic('world-ancient-civilizations', 'Ancient Civilizations', '🏛️', ['Egyptians', 'Romans', 'Greeks', 'Aztecs', 'Mayans', 'Incas', 'Vikings', 'Persians', 'Mongols', 'Babylonians', 'Celts', 'Spartans', 'Phoenicians', 'Sumerians', 'Carthaginians', 'Etruscans']),
    topic('world-sports', 'Sports Around the World', '🏏', ['Cricket', 'Sumo', 'Hurling', 'Kabaddi', 'Sepak Takraw', 'Curling', 'Lacrosse', 'Muay Thai', 'Rugby', 'Polo', 'Aussie Rules', 'Bobsled', 'Fencing', 'Taekwondo', 'Kendo', 'Jai Alai']),
    topic('world-souvenirs', 'Souvenirs', '🎁', ['Snow Globe', 'Fridge Magnet', 'Postcard', 'Keychain', 'T-Shirt', 'Shot Glass', 'Mug', 'Tea Towel', 'Spoon', 'Figurine', 'Sombrero', 'Maple Syrup', 'Wooden Clogs', 'Beret', 'Nesting Dolls', 'Boomerang']),
    topic('world-hats', 'Hats of the World', '👒', ['Sombrero', 'Beret', 'Fez', 'Cowboy Hat', 'Turban', 'Top Hat', 'Bowler', 'Conical Hat', 'Panama Hat', 'Fedora', 'Ushanka', 'Bearskin', "Tam o' Shanter", 'Flat Cap', 'Beanie', 'Pith Helmet'])
  ]
};

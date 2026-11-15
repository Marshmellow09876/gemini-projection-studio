/**
 * High-quality architectural projection mapping prompts for seasonal house displays.
 * Designed for Austin's ranch house facade: rooflines, eaves, garage doors, bay windows, and porch columns.
 */

export interface HolidayPrompt {
  id: string;
  title: string;
  category: 'Halloween' | 'Christmas';
  prompt: string;
  themeStyle: 'spooky' | 'laser' | 'victorian' | 'modern' | 'ice';
  icon: string;
}

export const HALLOWEEN_HOUSE_PROMPTS: HolidayPrompt[] = [
  {
    id: 'hal-01',
    title: 'Haunted Victorian Manor',
    category: 'Halloween',
    themeStyle: 'victorian',
    icon: '🏚️',
    prompt:
      'Gothic Haunted Manor projection mapped onto ranch house facade, weathered dark stone textures, crumbling brick mortar, glowing emerald mist billowing from porch foundation, sinister silhouettes gliding across upper eaves, photorealistic architectural alignment.',
  },
  {
    id: 'hal-02',
    title: 'Singing Jack-O\'-Lantern Choir',
    category: 'Halloween',
    themeStyle: 'spooky',
    icon: '🎃',
    prompt:
      'Trio of giant expressive carved Jack-O\'-Lanterns projection mapped onto front bay windows and garage doors, animated singing mouths synchronized to music, glowing orange candlelight flicker, curling green pumpkin vines wrapping gutters.',
  },
  {
    id: 'hal-03',
    title: 'Ghostbusters Firehouse & Ecto-1',
    category: 'Halloween',
    themeStyle: 'modern',
    icon: '👻',
    prompt:
      'Two-story Ghostbusters brick firehouse HQ mapped onto single-story ranch house, Ecto-1 parked inside open 2-car garage, proton packs under center window, purple containment unit in bay window, volumetric proton beam streaks.',
  },
  {
    id: 'hal-04',
    title: 'Slimer Ectoplasm Slime Breach',
    category: 'Halloween',
    themeStyle: 'laser',
    icon: '🟢',
    prompt:
      'Fluorescent neon-green ectoplasm oozing down the roof shingles and overflowing gutters, translucent Slimer ghost hovering over the garage bay, glowing proton stream crossfire illuminating the facade, dynamic neon fog.',
  },
  {
    id: 'hal-05',
    title: 'Wicked Witch Spell Cauldron',
    category: 'Halloween',
    themeStyle: 'spooky',
    icon: '🧙‍♀️',
    prompt:
      'Bubbling violet witch cauldron mapped onto front porch steps, glowing neon runes inscribed along roofline trim, green potion smoke swirling up exterior walls, black ravens perched along the ridges, eerie purple lighting.',
  },
  {
    id: 'hal-06',
    title: 'Graveyard Skeleton Dance & Tombstones',
    category: 'Halloween',
    themeStyle: 'spooky',
    icon: '💀',
    prompt:
      'Mossy cemetery headstones and mausoleum architecture mapped onto house walls, comical dancing skeletons peeking through window frames, full harvest moon casting dramatic shadows across roof, photorealistic brick displacement.',
  },
  {
    id: 'hal-07',
    title: 'Frankenstein\'s High-Voltage Laboratory',
    category: 'Halloween',
    themeStyle: 'laser',
    icon: '⚡',
    prompt:
      'High-voltage Tesla coils and arcing electrical lightning mapped along gutters and roof ridge, bubbling mad science vials in garage windows, glowing copper pipe conduits pulsing with blue sparks across facade.',
  },
  {
    id: 'hal-08',
    title: 'Spider Infestation & Arachnid Nest',
    category: 'Halloween',
    themeStyle: 'spooky',
    icon: '🕷️',
    prompt:
      'Giant glowing purple arachnid web covering entire house facade, hundreds of illuminated spiders skittering down exterior siding, pulsating spider egg sac nestled under garage eaves, creepy cobweb displacement.',
  },
  {
    id: 'hal-09',
    title: 'Creepy CarnEvil & Haunted Circus',
    category: 'Halloween',
    themeStyle: 'victorian',
    icon: '🎪',
    prompt:
      'Weathered black and orange striped circus tent facade mapped onto rooflines, sinister glowing clown face illusion peering from garage door, vintage carnival incandescent marquee bulbs flashing along trim.',
  },
  {
    id: 'hal-10',
    title: 'Ancient Egyptian Pharaoh Mummy Tomb',
    category: 'Halloween',
    themeStyle: 'victorian',
    icon: '🏺',
    prompt:
      'Ancient sandstone pharaoh temple ruins mapped onto ranch home, glowing hieroglyphics pulsing with gold light on porch columns, scarab beetles scuttling across stone doorway arch, warm torchlight flicker.',
  },
  {
    id: 'hal-11',
    title: 'Gargoyle Fortress & Stone Citadel',
    category: 'Halloween',
    themeStyle: 'victorian',
    icon: '🏰',
    prompt:
      'Heavy chiseled Gothic fortress stone walls mapped onto siding, animated stone gargoyles perched on corners stretching wings, torches burning in iron sconces beside entryway, crisp architectural parapets.',
  },
  {
    id: 'hal-12',
    title: 'Pirate Ghost Ship & Spectral Kraken',
    category: 'Halloween',
    themeStyle: 'spooky',
    icon: '🏴‍☠️',
    prompt:
      'Ghostly wrecked pirate galleon mapped onto house facade, tattered sails billowing on roof, glowing spectral Kraken tentacles wrapping around porch columns and garage, bioluminescent ocean waves crashing at foundation.',
  },
  {
    id: 'hal-13',
    title: 'Vampire Count\'s Transylvanian Castle',
    category: 'Halloween',
    themeStyle: 'victorian',
    icon: '🦇',
    prompt:
      'Dark gothic cathedral architecture mapped onto house, soaring stained glass windows illuminated in crimson red, swarms of fluttering bats bursting from chimney and gutters, dramatic blood-red moonlight.',
  },
  {
    id: 'hal-14',
    title: 'Toxic Biohazard Quarantine Zone',
    category: 'Halloween',
    themeStyle: 'laser',
    icon: '☣️',
    prompt:
      'Post-apocalyptic biohazard quarantine bunker mapped onto home, flashing yellow siren lights on roof corners, neon-yellow mutagen slime barrels leaking through garage seams, digital hazard symbols pulsing along siding.',
  },
  {
    id: 'hal-15',
    title: 'Grim Reaper Shadow Realm Portal',
    category: 'Halloween',
    themeStyle: 'spooky',
    icon: '🪦',
    prompt:
      'Towering hooded Grim Reaper projection floating behind chimney, glowing scythe casting razor-sharp neon silver arcs across roofline, swirling ghostly vortex in front door portal, deep obsidian shadow shaders.',
  },
  {
    id: 'hal-16',
    title: 'Haunted Antique Dollhouse',
    category: 'Halloween',
    themeStyle: 'victorian',
    icon: '🎎',
    prompt:
      'Cracked antique porcelain dollhouse facade mapped onto house, oversized clockwork marionette strings descending from eaves, glowing clock face ticking backwards in gable, flickering gaslight lamps.',
  },
  {
    id: 'hal-17',
    title: 'Cursed Bayou Swamp & Will-o\'-Wisps',
    category: 'Halloween',
    themeStyle: 'spooky',
    icon: '🌿',
    prompt:
      'Deep bayou swamp mapped onto house exterior, hanging Spanish moss swaying from gutters, glowing cypress knees protruding from lawn edge, wispy blue will-o\'-the-wisps dancing along windows, misty water reflections.',
  },
  {
    id: 'hal-18',
    title: 'Zombie Apocalypse Barricade Defense',
    category: 'Halloween',
    themeStyle: 'modern',
    icon: '🧟',
    prompt:
      'Boarded-up wooden planks and corrugated metal barricades mapped over windows and doors, clawing shadow hands pushing against frosted glass, flashing police searchlights sweeping across facade, warning sirens.',
  },
  {
    id: 'hal-19',
    title: 'Demon Dragon\'s Molten Magma Lair',
    category: 'Halloween',
    themeStyle: 'laser',
    icon: '🐉',
    prompt:
      'Molten magma cracks splitting open across house walls, glowing volcanic lava flowing down roof valleys into gutters, smoking dragon head emerging from garage breathing animated orange flame, intense heat distortion.',
  },
  {
    id: 'hal-20',
    title: 'Alien Mothership Abduction Beam',
    category: 'Halloween',
    themeStyle: 'laser',
    icon: '🛸',
    prompt:
      'Extraterrestrial saucer spacecraft hovering mapped above roofline, tractor beam of cyan light beaming down onto driveway, pulsating biomechanical glowing conduits running along architectural siding, starfield backdrop.',
  },
];

export const CHRISTMAS_HOUSE_PROMPTS: HolidayPrompt[] = [
  {
    id: 'xmas-01',
    title: 'Santa\'s Whimsical Toy Workshop',
    category: 'Christmas',
    themeStyle: 'victorian',
    icon: '🎅',
    prompt:
      'Bustling North Pole timber toy workshop mapped onto house facade, conveyor belts moving colorful gifts across roofline, animated clockwork gears turning in garage bay, snow-covered gingerbread eaves, warm golden lanterns.',
  },
  {
    id: 'xmas-02',
    title: 'Nutcracker Suite Ballet Fantasy',
    category: 'Christmas',
    themeStyle: 'victorian',
    icon: '💂',
    prompt:
      'Enchanted Nutcracker royal palace mapped onto ranch house, towering 12-foot Nutcracker soldiers flanking front entrance, golden mechanical music box drums spinning on garage doors, falling crystal snowflakes.',
  },
  {
    id: 'xmas-03',
    title: 'Cozy Gingerbread Cookie House',
    category: 'Christmas',
    themeStyle: 'modern',
    icon: '🍪',
    prompt:
      'Photorealistic iced gingerbread house mapped onto exterior walls, frosted white royal icing scalloped along roof trim, candy cane columns framing porch, gumdrop buttons and peppermint wheels glowing around windows.',
  },
  {
    id: 'xmas-04',
    title: 'Frozen Ice Palace & Crystal Cavern',
    category: 'Christmas',
    themeStyle: 'ice',
    icon: '❄️',
    prompt:
      'Glistening icy castle facade mapped onto house, crystalline icicles growing and refracting deep blue light along gutters, frost patterns crystallizing across windows, shimmering aurora borealis dancing overhead.',
  },
  {
    id: 'xmas-05',
    title: 'Classic Victorian Christmas Village',
    category: 'Christmas',
    themeStyle: 'victorian',
    icon: '🕯️',
    prompt:
      'Warm red brick Victorian estate mapped onto house, glowing multi-pane window frames showing warm family fireside scenes, fresh powdery snow clinging to window sills, lush evergreen pine garlands along roofline.',
  },
  {
    id: 'xmas-06',
    title: 'Dancing RGB Pixel Mega-Tree & Matrix',
    category: 'Christmas',
    themeStyle: 'laser',
    icon: '🎄',
    prompt:
      'Thousands of choreographed digital RGB pixel lights mapped onto house geometry, cascading vertical light curtains down front walls, dynamic starbursts exploding in sync along roof peak, high-speed color chases.',
  },
  {
    id: 'xmas-07',
    title: 'The Grinch\'s Whoville Mount Crumpit',
    category: 'Christmas',
    themeStyle: 'modern',
    icon: '🎁',
    prompt:
      'Whimsical curved Whoville architecture mapped onto house, wonky twisted candy-cane chimneys, bright neon pink and lime green whimsical decorations, tangled holiday light strands flickering playfully.',
  },
  {
    id: 'xmas-08',
    title: 'Santa & Flying Reindeer Rooftop Landing',
    category: 'Christmas',
    themeStyle: 'modern',
    icon: '🦌',
    prompt:
      'Snowy winter night roofline mapping, Santa\'s sleigh with glowing red-nosed Rudolph touching down on roof ridge, glittering gold magic fairy dust trailing behind across shingles, silhouette of reindeer leaping into night sky.',
  },
  {
    id: 'xmas-09',
    title: 'Enchanted Winter Snowglobe Illusion',
    category: 'Christmas',
    themeStyle: 'ice',
    icon: '🔮',
    prompt:
      '3D glass snowglobe illusion encasing the entire house, swirling volumetric blizzard snowflakes gently falling inside, miniature animated ice skaters gliding across garage bay frozen pond, brass pedestal base.',
  },
  {
    id: 'xmas-10',
    title: 'North Pole Express Steam Train',
    category: 'Christmas',
    themeStyle: 'victorian',
    icon: '🚂',
    prompt:
      'Victorian railway train station mapped onto ranch facade, animated steam locomotive pulling into garage bay with puffing billows of illuminated white smoke, brass station clock ticking on chimney, golden headlights.',
  },
  {
    id: 'xmas-11',
    title: 'Dancing Frosty Snowman Family',
    category: 'Christmas',
    themeStyle: 'modern',
    icon: '⛄',
    prompt:
      'Whimsical animated snowmen singing on front porch, snowball juggling routine mapped across front windows, carrot noses and silk top hats tipping to viewers, soft blue stage footlights and cheerful snow fall.',
  },
  {
    id: 'xmas-12',
    title: 'Holiday Candy Factory & Gumdrop Chutes',
    category: 'Christmas',
    themeStyle: 'modern',
    icon: '🍬',
    prompt:
      'Industrial whimsical candy factory mapped onto house, spiraling peppermint conveyor tubes wrapping columns, chocolate syrup rivers flowing into gutters, glowing marshmallow puffs filling garage bay.',
  },
  {
    id: 'xmas-13',
    title: 'Stained Glass Nativity Cathedral',
    category: 'Christmas',
    themeStyle: 'victorian',
    icon: '✨',
    prompt:
      'Illuminated Gothic cathedral facade mapped onto house, radiant stained glass windows depicting glowing star of Bethlehem, golden halo backlights radiating from center archway, rich cobalt and amber light beams.',
  },
  {
    id: 'xmas-14',
    title: 'Elf Mischief & Giant C9 Light Strings',
    category: 'Christmas',
    themeStyle: 'modern',
    icon: '🧝',
    prompt:
      'Animated cartoon elves scampering across gutters and climbing ladders, unrolling massive strings of giant retro C9 multicolored bulbs, comical tangled light antics on garage door, warm nostalgic glow.',
  },
  {
    id: 'xmas-15',
    title: 'Aurora Borealis Arctic Wonderland',
    category: 'Christmas',
    themeStyle: 'ice',
    icon: '🌌',
    prompt:
      'Deep midnight arctic landscape mapped onto facade, brilliant emerald and violet Northern Lights rippling across roofline, family of polar bears and penguins playing around entrance, crystalline snowdrifts.',
  },
  {
    id: 'xmas-16',
    title: 'Giant Architectural Advent Calendar',
    category: 'Christmas',
    themeStyle: 'victorian',
    icon: '📅',
    prompt:
      'Giant numbered architectural advent calendar mapped onto house siding and windows, numbered wooden doors opening sequentially to reveal animated toys, golden ribbons, and holiday sweets, festive brass numerals.',
  },
  {
    id: 'xmas-17',
    title: 'Holiday Hearth Fireplace & Stockings',
    category: 'Christmas',
    themeStyle: 'victorian',
    icon: '🔥',
    prompt:
      'Gigantic cozy cobblestone fireplace hearth mapped onto central facade, roaring warm orange fire crackling in garage opening, oversized knit holiday stockings hanging from eaves, golden sparks floating upward.',
  },
  {
    id: 'xmas-18',
    title: 'Golden Baroque Angelic Symphony',
    category: 'Christmas',
    themeStyle: 'victorian',
    icon: '🪽',
    prompt:
      'Ornate golden filigree baroque palace mapped onto home, radiant marble angel statues with golden trumpets along roofline, cascading starlight showers dripping like liquid gold down walls, celestial aura.',
  },
  {
    id: 'xmas-19',
    title: 'Laser Light Spectacular & Holiday EDM',
    category: 'Christmas',
    themeStyle: 'laser',
    icon: '🎇',
    prompt:
      'High-energy holiday laser projection mapping, razor-sharp green, red, and cyan laser geometric vectors tracing house architectural corners, pulsating equalizer audio bars mapped onto windows, strobe flashes.',
  },
  {
    id: 'xmas-20',
    title: 'Pine Forest & Woodland Animals',
    category: 'Christmas',
    themeStyle: 'ice',
    icon: '🦌',
    prompt:
      'Lush snow-laden pine forest mapped onto house exterior, gentle woodland deer and foxes wandering between porch columns, soft golden fairy lights sparkling among pine needles, tranquil winter snowfall.',
  },
];

export const ALL_HOLIDAY_PROMPTS: HolidayPrompt[] = [
  ...HALLOWEEN_HOUSE_PROMPTS,
  ...CHRISTMAS_HOUSE_PROMPTS,
];

/**
 * Returns a randomly selected prompt from the combined 40 Halloween and Christmas prompts.
 */
export function getRandomHolidayPrompt(): HolidayPrompt & { index: number; total: number } {
  const total = ALL_HOLIDAY_PROMPTS.length;
  const index = Math.floor(Math.random() * total);
  return {
    ...ALL_HOLIDAY_PROMPTS[index],
    index: index + 1,
    total,
  };
}

/**
 * Returns a randomly selected prompt specifically from the 20 Halloween prompts.
 */
export function getRandomHalloweenPrompt(): HolidayPrompt & { index: number; total: number } {
  const total = HALLOWEEN_HOUSE_PROMPTS.length;
  const index = Math.floor(Math.random() * total);
  return {
    ...HALLOWEEN_HOUSE_PROMPTS[index],
    index: index + 1,
    total,
  };
}

/**
 * Returns a randomly selected prompt specifically from the 20 Christmas prompts.
 */
export function getRandomChristmasPrompt(): HolidayPrompt & { index: number; total: number } {
  const total = CHRISTMAS_HOUSE_PROMPTS.length;
  const index = Math.floor(Math.random() * total);
  return {
    ...CHRISTMAS_HOUSE_PROMPTS[index],
    index: index + 1,
    total,
  };
}

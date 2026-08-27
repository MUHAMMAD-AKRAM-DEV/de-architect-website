/* ============================================================================
   DE Architects — the project list
   ----------------------------------------------------------------------------
   One source of truth, shared by the grid (projects.html), the detail page
   (project.html) and the carousel on the landing page. Adding a project means
   adding an entry here and nothing else.

   `tour` points at a GLB in assets/3d/web/ and is what marks a project as
   having a virtual visit. Leave it out and the detail page falls back to the
   image showcase, which is the normal case.

   `video` points at an mp4 in assets/video/. The detail page probes the file
   and only shows the film section once it loads, so naming a video here that
   has not been shot yet costs nothing and breaks nothing — see the README in
   assets/video/ for the filenames and the encode settings.
   ========================================================================== */
window.DE_PROJECTS = [
  {
    slug: 'riverside-house',
    title: 'Riverside House',
    category: 'Residential',
    place: 'Brooklyn, NY',
    year: '2024',
    blurb: 'A family house on a narrow riverside plot, planned around the light that reaches it.',
    cover: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=82',
    video: { file: 'assets/video/riverside-house.mp4', caption: 'A walk along the timber screen, from the street to the water.' },
    tour: { file: 'assets/3d/web/exterior.glb', kind: 'Exterior walk-around' },
    facts: [['Scope', 'New build'], ['Area', '340 m²'], ['Completed', '2024'], ['Role', 'Architecture & interiors']],
    body: [
      'The site is long, narrow and faces away from the water, so the house turns its back on the street and opens along its length instead. Every principal room reaches daylight from two directions.',
      'A deep timber screen runs the full elevation, shading the glazing through the afternoon and giving the street a quiet, unbroken face. Behind it the plan is entirely open at ground level.'
    ],
    gallery: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=82',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=82',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=82'
    ]
  },
  {
    slug: 'copper-loft',
    title: 'Copper Loft',
    category: 'Interior',
    place: 'Manhattan, NY',
    year: '2023',
    blurb: 'A warehouse floor stripped back and rebuilt around a single copper-clad core.',
    cover: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1400&q=82',
    video: { file: 'assets/video/copper-loft.mp4', caption: 'One turn around the copper core, in morning light.' },
    tour: { file: 'assets/3d/web/interior.glb', kind: 'Interior walkthrough' },
    facts: [['Scope', 'Full fit-out'], ['Area', '210 m²'], ['Completed', '2023'], ['Role', 'Interior design']],
    body: [
      'Everything the loft needs — kitchen, bathrooms, storage, plant — is gathered into one freestanding core, so the perimeter stays completely open and the original windows read end to end.',
      'The core is clad in copper that will darken over the next decade. Around it the palette stays deliberately quiet: lime plaster, oak boards and blackened steel.'
    ],
    gallery: [
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=82',
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=82',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=82'
    ]
  },
  {
    slug: 'studio-north',
    title: 'Studio North',
    category: 'Commercial',
    place: 'Queens, NY',
    year: '2023',
    blurb: 'A workspace for a design practice, built around one long shared table.',
    cover: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=82',
    video: { file: 'assets/video/studio-north.mp4', caption: 'The long table filling up over a working morning.' },
    facts: [['Scope', 'Office fit-out'], ['Area', '480 m²'], ['Completed', '2023'], ['Role', 'Architecture']],
    body: [
      'The brief asked for a studio with no private offices at all. A single twelve-metre table runs the length of the floor and everything else — meeting rooms, library, making space — is arranged loosely around it.',
      'North light was the constraint that set the section: the roof lifts on the north side to bring in even daylight without a single south-facing pane.'
    ],
    gallery: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=82',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=82'
    ]
  },
  {
    slug: 'the-warehouse',
    title: 'The Warehouse',
    category: 'Renovation',
    place: 'Brooklyn, NY',
    year: '2022',
    blurb: 'A 1920s goods store brought back with as little new material as possible.',
    cover: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1400&q=82',
    video: { file: 'assets/video/the-warehouse.mp4', caption: 'The brick shell before and after, cut together.' },
    facts: [['Scope', 'Restoration'], ['Area', '620 m²'], ['Completed', '2022'], ['Role', 'Architecture']],
    body: [
      'Almost nothing was removed. The brick was cleaned rather than repointed, the timber trusses were left with their original paint, and the new work is confined to a steel mezzanine that touches the shell in six places.',
      'What the building lacked was insulation and daylight. Both were solved from the roof, which keeps the elevations exactly as they were found.'
    ],
    gallery: [
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=82',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=82'
    ]
  },
  {
    slug: 'hillside-villa',
    title: 'Hillside Villa',
    category: 'Residential',
    place: 'Hudson Valley',
    year: '2024',
    blurb: 'Three linked pavilions stepping down a slope, each following the contour it sits on.',
    cover: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=82',
    video: { file: 'assets/video/hillside-villa.mp4', caption: 'The approach, the terrace, and the view the house was planned around.' },
    facts: [['Scope', 'New build'], ['Area', '410 m²'], ['Completed', '2024'], ['Role', 'Architecture & landscape']],
    body: [
      'Rather than cut a single level platform into the hill, the house is split into three pavilions, each set on its own contour and joined by short glazed links.',
      'The result is a house you walk down through. Every pavilion has its own outlook and the excavation was reduced to almost nothing.'
    ],
    gallery: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=82',
      'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=82'
    ]
  },
  {
    slug: 'meridian-offices',
    title: 'Meridian Offices',
    category: 'Commercial',
    place: 'Manhattan, NY',
    year: '2023',
    blurb: 'Six floors reorganised around a new stair that finally connects them.',
    cover: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=82',
    video: { file: 'assets/video/meridian-offices.mp4', caption: 'Two floors, at the pace people actually move through them.' },
    facts: [['Scope', 'Refurbishment'], ['Area', '3 100 m²'], ['Completed', '2023'], ['Role', 'Architecture']],
    body: [
      'The building had six floors and one lift core, which meant nobody met anyone from another floor. A single cut through the slabs allowed a stair to link all six.',
      'Everything else followed from that move: the social spaces migrated to the stair, and the perimeter went back to being quiet work space.'
    ],
    gallery: [
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=82',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=82'
    ]
  },
  {
    slug: 'slate-kitchen',
    title: 'Slate Kitchen',
    category: 'Interior',
    place: 'Brooklyn, NY',
    year: '2022',
    blurb: 'One room, one material, and a window seat that took half the budget.',
    cover: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=82',
    video: { file: 'assets/video/slate-kitchen.mp4', caption: 'Close on the slate, the joinery and the noon light.' },
    facts: [['Scope', 'Kitchen & dining'], ['Area', '46 m²'], ['Completed', '2022'], ['Role', 'Interior design']],
    body: [
      'A single slab of slate runs from the worktop down to the floor at both ends, which let every other surface stay plain and painted.',
      'The window seat was the client’s one request. It is deeper than it needs to be, and it is where the family now eats most meals.'
    ],
    gallery: [
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=82',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=82'
    ]
  },
  {
    slug: 'cedar-retreat',
    title: 'Cedar Retreat',
    category: 'Residential',
    place: 'Catskills, NY',
    year: '2023',
    blurb: 'A small weekend house that will silver to match the trees around it.',
    cover: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1400&q=82',
    video: { file: 'assets/video/cedar-retreat.mp4', caption: 'Through the trees to the porch, in late autumn.' },
    facts: [['Scope', 'New build'], ['Area', '120 m²'], ['Completed', '2023'], ['Role', 'Architecture']],
    body: [
      'Untreated cedar, left to weather. In five years the house will be the same grey as the trunks it stands among, which was the whole point.',
      'Inside it is a single volume with a sleeping platform above, heated by one stove and nothing else.'
    ],
    gallery: [
      'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=82',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=82'
    ]
  },
  {
    slug: 'the-foundry',
    title: 'The Foundry',
    category: 'Renovation',
    place: 'Queens, NY',
    year: '2021',
    blurb: 'A metal works turned into eleven studios without losing the crane rail.',
    cover: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=82',
    video: { file: 'assets/video/the-foundry.mp4', caption: 'The old crane rail, kept, and everything built beneath it.' },
    facts: [['Scope', 'Conversion'], ['Area', '890 m²'], ['Completed', '2021'], ['Role', 'Architecture']],
    body: [
      'The crane rail runs the full length of the hall and was the one thing the tenants asked us not to touch. Every new partition stops short of it.',
      'The studios are built as freestanding boxes, so the original volume is still legible from end to end above them.'
    ],
    gallery: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=82',
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=82'
    ]
  },
  {
    slug: 'harbour-penthouse',
    title: 'Harbour Penthouse',
    category: 'Interior',
    place: 'Manhattan, NY',
    year: '2024',
    blurb: 'A top floor replanned so the view arrives gradually rather than all at once.',
    cover: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1400&q=82',
    video: { file: 'assets/video/harbour-penthouse.mp4', caption: 'Sunset across the terrace and back into the living space.' },
    facts: [['Scope', 'Full fit-out'], ['Area', '260 m²'], ['Completed', '2024'], ['Role', 'Interior design']],
    body: [
      'The flat had the harbour on three sides and no sense of arrival at all. The entry now runs through a deliberately low, dark hall before the space opens.',
      'That one restraint makes the view land properly. Everything after it is kept pale and low so nothing competes.'
    ],
    gallery: [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=82',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=82'
    ]
  },
  {
    slug: 'lantern-house',
    title: 'Lantern House',
    category: 'Residential',
    place: 'Hudson Valley',
    year: '2022',
    blurb: 'A dark house with one glowing room at its centre.',
    cover: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=82',
    video: { file: 'assets/video/lantern-house.mp4', caption: 'The lantern lit at dusk, seen from the garden.' },
    facts: [['Scope', 'New build'], ['Area', '265 m²'], ['Completed', '2022'], ['Role', 'Architecture & interiors']],
    body: [
      'The house is clad in charred timber and reads almost black from the approach. At its centre a double-height room is finished entirely in pale birch.',
      'After dark that room lights the whole plan through internal windows, which is where the name came from.'
    ],
    gallery: [
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=82',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=82'
    ]
  },
  {
    slug: 'atrium-works',
    title: 'Atrium Works',
    category: 'Commercial',
    place: 'Brooklyn, NY',
    year: '2021',
    blurb: 'Two buildings joined by the courtyard that used to separate them.',
    cover: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1400&q=82',
    video: { file: 'assets/video/atrium-works.mp4', caption: 'Looking up through the atrium as the roof lights come on.' },
    facts: [['Scope', 'Extension'], ['Area', '1 450 m²'], ['Completed', '2021'], ['Role', 'Architecture']],
    body: [
      'The two halves of the site had never been connected. Roofing the yard between them created a single atrium that now does all the circulation for both.',
      'The roof is a light steel grid carried on the existing walls, so neither building needed strengthening.'
    ],
    gallery: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=82',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=82'
    ]
  }
];

import type { UiMessages } from '../types.ts'

export const enMessages = {
  navigation: { main: 'Main navigation', mobile: 'Mobile navigation', home: 'Home', openMenu: 'Open navigation', closeMenu: 'Close navigation' },
  theme: { light: 'Light', dark: 'Dark', switchToLight: 'Switch to light theme', switchToDark: 'Switch to dark theme' },
  locale: { selector: 'Language selector', zhCN: '简', zhHK: '繁', en: 'EN', switchToZhCN: 'Switch to Simplified Chinese', switchToZhHK: 'Switch to Traditional Chinese', switchToEnglish: 'Current language: English' },
  accessibility: { skipToMain: 'Skip to main content', readingProgress: 'Reading progress', home: 'Return home', footerHome: 'Return to the personal archive home', liveProduct: 'Open live product', projectStory: 'Project story' },
  common: { online: 'Online', current: 'Current', previous: 'Previous image', next: 'Next image', readPaper: 'Read paper', openProject: 'Open project', proof: 'Evidence', source: 'Source', deployedAs: 'Deployed as', liveProduct: 'Live product', project: 'Project', projectNote: 'Project note', chapters: 'chapters', proofLinks: 'Evidence & links', role: 'Role', stack: 'Stack', single: 'Single', copyCitation: 'Copy citation', copyInProgress: 'Copying…', copied: 'Copied', copyFailed: 'Copy failed; copy manually' },
  actions: { selectedWork: 'View selected work', exploreWorlds: 'Explore five worlds', scrollToExplore: 'Scroll to explore', readResearch: 'Read research', viewCaseStudy: 'View product case study', exploreAcademics: 'View academic profile', viewHonors: 'View honors', enterProject: 'View project', viewOnGitHub: 'View on GitHub', sourceCode: 'Source code', openResearch: 'Open research' },
  home: { identity: 'Researcher / Builder / Music Listener', researchLabel: 'Research', selectedWorkLabel: 'Selected work', productLabel: 'Product', researchToProduct: 'Research → Product', exploreLabel: 'Explore', worldsDescription: 'Five rooms for academics, honors, research, works, and music.', beyondLabel: 'Beyond the lab', leadership: 'Leadership', selectedActivities: 'Selected activities' },
  research: { expandMethodology: 'Expand methodology', collapseMethodology: 'Collapse methodology', question: 'Question', hypothesis: 'Hypothesis', method: 'Method', prototype: 'Prototype', result: 'Result', next: 'Next step', workbench: 'Research workbench', toolsInRotation: 'Tools in rotation', researchLoopActive: 'Research loop active', questionToEvidenceToProduct: 'Question → Evidence → Product', toolsCount: 'Tools', methodsLabel: 'Methods and toolchain' },
  honors: { filterLabel: 'Filter honors by site tier', all: 'All', peak: 'Pioneer tier', excellent: 'Distinguished tier', emerging: 'Emerging tier', honorsUnit: 'honors' },
  lightbox: { gallery: 'Concert poster gallery', close: 'Close lightbox', previous: 'Previous image', next: 'Next image', position: (current, total) => ` · image ${current} of ${total}`, loading: 'Loading image', failed: 'Image failed to load', retry: 'Retry', posterAlt: 'poster', openArchive: 'Open archive' },
  footer: { homeLabel: 'Back to home', contactsLabel: 'Contact', archive: 'PERSONAL ARCHIVE / 2026', identity: 'RESEARCHER / BUILDER / MUSIC LISTENER', email: 'Email', github: 'GitHub' },
  error404: { kicker: 'SIGNAL LOST', title: 'This page wandered off', copy: 'The page you requested does not exist or has moved. Return home and choose another room.', home: 'Return home', research: 'Explore research' },
  loadError: { loading: 'Loading page content', title: 'This page could not load', copy: 'The page resources did not finish loading. Please try again.', retry: 'Reload page' },
  poster: { loading: 'Loading poster', failed: 'Preview unavailable', retry: 'Retry image', original: 'Open original image' },
  empty: { honors: 'There are no records in this category yet.', viewAll: 'View all', works: 'Projects are being organized. Please check back later.', concerts: 'There are no concert records yet.', selectedWork: 'Selected work is being organized. Explore the archive for more.' },
  status: { active: 'Active', published: 'Published', completed: 'Completed', deployed: 'Deployed', 'open-source': 'Open source', planned: 'Planned', archived: 'Archived' },
  page: {
    home: {
      kicker: 'PERSONAL ARCHIVE / BEIJING · 2026',
      title: 'SONG NOTES',
      copy: 'A record of research, shipped products, and the life fragments lit by music and live shows. Start with a real question, then follow the evidence toward something usable.',
      slideshow: {
        groupLabel: 'Homepage photo carousel',
        roleDescription: 'carousel',
        play: 'Play photo carousel',
        pause: 'Pause photo carousel',
        static: 'Photo carousel is paused by your reduced motion preference',
        showPhoto: (current, total, name) => `Show photo ${current} of ${total}: ${name}`,
        photos: { 1: 'Campus speech', 2: 'Campus photo', 3: 'Group photo', 4: 'Stage view', 5: 'Concert screen', 6: 'Group photo', 7: 'Performer close-up', 8: 'Autumn campus group photo', 9: 'Campus event', 10: 'KPL grand finals ticket', 11: 'Records and drinks', 12: 'Live concert', 13: 'Panda' },
        status: {
          photoShown: (current, total, name) => `Showing photo ${current} of ${total}: ${name}`,
          photoSelected: (current, total, name) => `Selected photo ${current} of ${total}: ${name}. Photos are hidden in high contrast mode.`,
          loadFailed: (name) => `${name} could not be loaded. The current photo remains visible.`
        }
      }
    },
    academics: { kicker: 'ACADEMICS', title: 'From here, tomorrow finds its course', copy: 'Coursework, standardized tests, and AP results—evidence of how the work has accumulated.' },
    honors: { kicker: 'HONORS', title: 'Step by step, I keep climbing', copy: 'Awards mark the route; the more useful signal is the habit of continuing upward.' },
    research: { kicker: 'RESEARCH', title: 'You share this imperfect dream with me', copy: 'From smart agriculture to explainable AI, I turn models into tools that people can open and use.' },
    works: { kicker: 'WORKS', title: 'Little by little, I learned that effort can lead to success', copy: 'Two evolving project worlds showing how ideas leave the page and become products or open learning resources.' },
    concerts: { kicker: 'CONCERTS', title: 'Fate brought us together beyond this restless world', copy: 'Concerts, posters, and the nights when light and a shared chorus changed the scale of the world.' }
  }
} satisfies UiMessages

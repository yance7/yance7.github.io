import type { SiteLocaleCopy } from '../types'

export const siteCopy = {
  pageMeta: {
    home: { kicker: 'PERSONAL ARCHIVE / BEIJING · 2026', title: 'SONG NOTES', copy: 'A record of research, shipped products, and the life fragments lit by music and live shows. Start with a real question, then follow the evidence toward something usable.' },
    academics: { kicker: 'ACADEMICS', title: 'Academic record', copy: 'Coursework, standardized tests, and AP results—evidence of how the work has accumulated.' },
    honors: { kicker: 'HONORS', title: 'Selected honors', copy: 'Awards mark the route; the more useful signal is the habit of continuing upward.' },
    research: { kicker: 'RESEARCH', title: 'Research beyond the paper', copy: 'From smart agriculture to explainable AI, I turn models into tools that people can open and use.' },
    works: { kicker: 'WORKS', title: 'Building ideas into products', copy: 'A deployed product archive showing how a question leaves the page and becomes something people can use.' },
    concerts: { kicker: 'CONCERTS', title: 'Live music archive', copy: 'Concerts, posters, and the nights when light and a shared chorus changed the scale of the world.' }
  },
  nav: {
    home: { label: 'Home', desc: 'Personal archive entrance' },
    academics: { label: 'Academics', desc: 'Coursework, tests, and AP results' },
    honors: { label: 'Honors', desc: 'Awards and competition record' },
    research: { label: 'Research', desc: 'From papers to products' },
    works: { label: 'Works', desc: 'Deployed projects' },
    concerts: { label: 'Concerts', desc: 'Live music archive' }
  },
  sections: {
    home: [{ id: 'selected-work', label: 'Selected work', shortLabel: 'Work' }, { id: 'home-worlds', label: 'Five worlds', shortLabel: 'Worlds' }, { id: 'home-beyond', label: 'Beyond the lab', shortLabel: 'Beyond' }],
    academics: [{ id: 'sec-education', label: 'Education', shortLabel: 'Education' }, { id: 'sec-scoreboard', label: 'Scoreboard', shortLabel: 'Scores' }, { id: 'sec-ap-archive', label: 'AP archive', shortLabel: 'AP' }],
    honors: [{ id: 'sec-milestones', label: 'Milestones', shortLabel: 'Milestones' }, { id: 'sec-honors-archive', label: 'Honors archive', shortLabel: 'Archive' }],
    research: [{ id: 'sec-research-timeline', label: 'Research timeline', shortLabel: 'Research' }, { id: 'sec-toolchain', label: 'Methods and tools', shortLabel: 'Methods' }],
    works: [{ id: 'works-overview', label: 'Released worlds', shortLabel: 'Works' }, { id: 'project-fresheye', label: 'FreshEye', shortLabel: 'FreshEye' }],
    concerts: [{ id: 'concerts-overview', label: 'Live archive', shortLabel: 'Live' }, { id: 'concert-archive', label: 'Concert archive', shortLabel: 'Posters' }, { id: 'album-frequencies', label: 'Album wall', shortLabel: 'Albums' }]
  },
  worlds: {
    academics: { no: '01', label: 'Academics', icon: '✦', desc: 'Coursework, standardized tests, and AP results—the readable record of sustained work.', accent: 'aqua' },
    honors: { no: '02', label: 'Honors', icon: '❖', desc: 'Awards mark the route; the useful signal is the habit of continuing upward.', accent: 'violet' },
    research: { no: '03', label: 'Research', icon: '◉', desc: 'From smart agriculture to explainable AI, turning models into tools people can use.', accent: 'gold' },
    works: { no: '04', label: 'Works', icon: '♬', desc: 'A deployed product archive showing how ideas leave the page and meet real use.', accent: 'aqua' },
    concerts: { no: '05', label: 'Concerts', icon: '♪', desc: 'Live shows and posters: the personal archive beyond the lab.', accent: 'gold' }
  },
  home: {
    heroTitle: 'Research, build,', heroAccent: 'then meet the live world',
    selectedTitle: 'Turning research', selectedAccent: 'into something usable', selectedCopy: 'Start with work still moving forward, then follow the path to a product people can open.',
    worldsTitle: 'Five', worldsAccent: 'ways in', worldsCopy: 'A compact map of academics, honors, research, works, and music.',
    beyondTitle: 'Beyond the lab', beyondAccent: 'keep growing', beyondCopy: 'Selected leadership and activities that show organization, collaboration, and follow-through.'
  }
} satisfies SiteLocaleCopy

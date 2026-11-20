import type { SiteLocaleCopy } from '../types.ts'

export const siteCopy = {
  pageMeta: {
    home: { kicker: 'PERSONAL ARCHIVE / BEIJING · 2026', title: 'SONG NOTES', imageAlt: 'Yance personal archive home card — researcher, builder, and music listener; online, 2026.', documentTitle: 'Home · Yance', contentUpdatedAt: '2026-10-30', copy: 'A record of research, shipped products, and the life fragments lit by music and live shows. Start with a real question, then follow the evidence toward something usable.' },
    academics: { kicker: 'ACADEMICS', heading: 'Academics', title: 'From here, tomorrow finds its course', epigraph: 'From here, tomorrow finds its course', documentTitle: 'Academics · Yance', contentUpdatedAt: '2026-10-23', copy: 'Coursework, standardized tests, and AP results—evidence of how the work has accumulated.', credit: { artist: 'JJ Lin', song: '明日坐标', album: '明日坐标' } },
    honors: { kicker: 'HONORS', heading: 'Honors', title: 'Step by step, I keep climbing', epigraph: 'Step by step, I keep climbing', documentTitle: 'Honors · Yance', contentUpdatedAt: '2026-10-23', copy: 'Awards mark the route; the more useful signal is the habit of continuing upward.', credit: { artist: 'Jay Chou', song: '蜗牛', album: 'Fantasy Plus' } },
    research: { kicker: 'RESEARCH', heading: 'Research', title: 'You share this imperfect dream with me', epigraph: 'You share this imperfect dream with me', documentTitle: 'Research · Yance', copy: 'From smart agriculture to explainable AI, I turn models into tools that people can open and use.', credit: { artist: 'TFBOYS', song: '不完美小孩', album: '我们的时光' } },
    works: { kicker: 'WORKS', heading: 'Works', title: 'Little by little, I learned that effort can lead to success', epigraph: 'Little by little, I learned that effort can lead to success', documentTitle: 'Works · Yance', copy: 'Three evolving project worlds showing how ideas leave the page and become products or open learning resources.', credit: { artist: 'Silence Wang', song: '慢慢懂', album: '慢慢懂' } },
    concerts: { kicker: 'CONCERTS', heading: 'Concerts', title: 'Fate brought us together beyond this restless world', epigraph: 'Fate brought us together beyond this restless world', documentTitle: 'Concerts · Yance', contentUpdatedAt: '2026-10-31', copy: 'Concerts, posters, and the nights when light and a shared chorus changed the scale of the world.', credit: { artist: 'G.E.M.', song: '光年之外', album: '' } }
  },
  nav: {
    home: { label: 'Home', desc: 'Personal archive overview' },
    academics: { label: 'Academics', desc: 'Coursework, tests, and AP results' },
    honors: { label: 'Honors', desc: 'Awards and competition record' },
    research: { label: 'Research', desc: 'From papers to products' },
    works: { label: 'Works', desc: 'Evolving projects and open learning resources' },
    concerts: { label: 'Concerts', desc: 'Live music archive' }
  },
  worlds: {
    academics: { no: '01', label: 'Academics', icon: '✦', desc: 'Coursework, standardized tests, and AP results—the readable record of sustained work.', accent: 'aqua' },
    honors: { no: '02', label: 'Honors', icon: '❖', desc: 'Awards mark the route; the useful signal is the habit of continuing upward.', accent: 'violet' },
    research: { no: '03', label: 'Research', icon: '◉', desc: 'From smart agriculture to explainable AI, turning models into tools people can use.', accent: 'gold' },
    works: { no: '04', label: 'Works', icon: '♬', desc: 'Three evolving project worlds showing how ideas leave the page and become products or open learning resources.', accent: 'aqua' },
    concerts: { no: '05', label: 'Concerts', icon: '♪', desc: 'Live shows and posters: the personal archive beyond the lab.', accent: 'gold' }
  },
  home: {
    heroGreeting: 'Hi, I’m Yance', heroStatement: 'Welcome to my world',
    selectedTitle: 'Turning research', selectedAccent: 'into something usable', selectedCopy: 'Start with work still moving forward, then follow the path to a product people can open.',
    worldsTitle: 'Five', worldsAccent: 'ways in', worldsCopy: 'A compact map of academics, honors, research, works, and music.',
    beyondTitle: 'Beyond the lab', beyondAccent: 'keep growing', beyondCopy: 'Selected leadership and activities that show organization, collaboration, and follow-through.'
  }
} satisfies SiteLocaleCopy

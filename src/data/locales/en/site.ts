import type { SiteLocaleCopy } from '../types'

export const siteCopy = {
  pageMeta: {
    home: { kicker: 'PERSONAL ARCHIVE / BEIJING · 2026', title: 'SONG NOTES', copy: 'A record of research, shipped products, and the life fragments lit by music and live shows. Start with a real question, then follow the evidence toward something usable.' },
    academics: { kicker: 'ACADEMICS', title: 'From here, tomorrow finds its way', copy: 'Coursework, standardized tests, and AP results—evidence of how the work has accumulated.', credit: { artist: 'JJ Lin', song: '明日坐标', album: '明日坐标' } },
    honors: { kicker: 'HONORS', title: 'Step by step, I climb toward the light', copy: 'Awards mark the route; the more useful signal is the habit of continuing upward.', credit: { artist: 'Jay Chou', song: '蜗牛', album: 'Fantasy Plus' } },
    research: { kicker: 'RESEARCH', title: 'My dream is imperfect; still, you dream it with me', copy: 'From smart agriculture to explainable AI, I turn models into tools that people can open and use.', credit: { artist: 'TFBOYS', song: '不完美小孩', album: '我们的时光' } },
    works: { kicker: 'WORKS', title: 'Slowly I learned: keep striving, and success will come', copy: 'Two evolving project worlds showing how ideas leave the page and become products or open learning resources.', credit: { artist: 'Silence Wang', song: '慢慢懂', album: '慢慢懂' } },
    concerts: { kicker: 'CONCERTS', title: 'Fate brought us together, beyond this restless world', copy: 'Concerts, posters, and the nights when light and a shared chorus changed the scale of the world.', credit: { artist: 'G.E.M.', song: '光年之外', album: '' } }
  },
  nav: {
    home: { label: 'Home', desc: 'Personal archive entrance' },
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
    works: { no: '04', label: 'Works', icon: '♬', desc: 'Two evolving project worlds showing how ideas leave the page and become products or open learning resources.', accent: 'aqua' },
    concerts: { no: '05', label: 'Concerts', icon: '♪', desc: 'Live shows and posters: the personal archive beyond the lab.', accent: 'gold' }
  },
  home: {
    heroTitle: 'Research, build,', heroAccent: 'then meet the live world',
    selectedTitle: 'Turning research', selectedAccent: 'into something usable', selectedCopy: 'Start with work still moving forward, then follow the path to a product people can open.',
    worldsTitle: 'Five', worldsAccent: 'ways in', worldsCopy: 'A compact map of academics, honors, research, works, and music.',
    beyondTitle: 'Beyond the lab', beyondAccent: 'keep growing', beyondCopy: 'Selected leadership and activities that show organization, collaboration, and follow-through.'
  }
} satisfies SiteLocaleCopy

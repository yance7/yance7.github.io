import { research } from '../../research'
import type { ResearchLocaleCopy, ResearchCopy } from '../types'

const base = Object.fromEntries(research.map((item) => [item.id, {
  title: item.title, text: item.text, tag: item.tag, org: item.org, metrics: item.metrics, methodology: item.methodology, proof: item.proof
}])) as Record<string, ResearchCopy>

const enMethods = [
  { label: 'PyTorch', en: 'Deep learning', cat: 'DEEP LEARNING' }, { label: 'EfficientNet', en: 'Backbone', cat: 'DEEP LEARNING' }, { label: 'CBAM / LightCRA', en: 'Attention', cat: 'DEEP LEARNING' }, { label: 'Grad-CAM', en: 'Interpretability', cat: 'EXPLAINABLE AI' }, { label: 'ONNX', en: 'Deployment', cat: 'ENGINEERING' }, { label: 'FastAPI', en: 'Backend', cat: 'ENGINEERING' }, { label: 'Hugging Face', en: 'Hosting', cat: 'ENGINEERING' }, { label: '16S rRNA', en: 'Microbiome', cat: 'SCIENCE' }, { label: 'Random Forest', en: 'Regression', cat: 'SCIENCE' }
]

export const researchCopy = {
  entities: {
    ...base,
    fresheye: {
      ...base.fresheye!,
      title: 'FreshEye: A Browser Tool for Fish Freshness Assessment',
      text: 'I turned the FishFreshNet research line into a zero-install web tool. Upload a fish-eye image to receive a freshness class, confidence score, and Grad-CAM heatmap.',
      org: 'Personal project · Hugging Face Spaces + GitHub Pages',
      metrics: [{ value: 'Zero install', label: 'Browser' }, { value: 'Grad-CAM', label: 'Interpretability' }, { value: 'PDF', label: 'Report export' }],
      methodology: {
        question: 'How can fish freshness assessment move from the lab into daily use?',
        hypothesis: 'A lightweight CNN with Grad-CAM can deliver real-time, explainable freshness grading in the browser.',
        method: 'FishFreshNet V2 + ONNX inference + Dockerized FastAPI backend + responsive frontend',
        prototype: 'Deployed on Hugging Face Spaces as a zero-install web tool with drag-and-drop upload and one-click PDF export.',
        result: 'Live deployment with < 200ms inference latency and a locally searchable history.',
        next: 'Mobile support + more fish species'
      }
    },
    'fishfreshnet-v2': {
      ...base['fishfreshnet-v2']!,
      title: 'FishFreshNet V2: Lightweight, Explainable Fish-Eye Assessment',
      text: 'I introduced LightCRA ring-region attention and ECA channel attention to reach 99.29% accuracy while retaining a lightweight deployment profile.',
      org: 'Independent research · FishFreshNet V2',
      metrics: [{ value: '99.29%', label: 'Accuracy', note: '5-seed mean' }, { value: '4.095M', label: 'Parameters', note: 'V2 model' }, { value: '5.31ms', label: 'Inference', note: 'device setup' }, { value: 'V2-Lite 95.72%', label: 'Lightweight model' }],
      methodology: {
        question: 'How can explainability improve without losing a lightweight fish-eye classifier?',
        hypothesis: 'Ring-region attention can capture radial iris degradation, while ECA provides low-cost channel recalibration.',
        method: 'LightCRA (+0.083M parameters) + ECA channel attention + five-seed mean + paired t-test + ablation study',
        prototype: 'PyTorch implementation trained and evaluated on the MFED dataset.',
        result: '99.29% accuracy with 4.095M parameters and 5.31ms per image; V2-Lite reaches 95.72% with 0.929M parameters and 0.061G FLOPs.',
        next: 'Deploy as the FreshEye web tool'
      }
    },
    'fishfreshnet-v1': {
      ...base['fishfreshnet-v1']!,
      title: 'FishFreshNet V1: Lightweight Explainable Assessment with Attention',
      text: 'I built the MFED multi-stage fish-eye dataset, integrated CBAM into EfficientNet-B0, and paired it with Grad-CAM for lightweight, explainable freshness grading.',
      org: 'International conference paper · ICIPAI 2026',
      metrics: [{ value: '99.23%', label: 'Accuracy', note: 'MFED · paper result' }, { value: '4.22M', label: 'Parameters' }, { value: '0.41G', label: 'FLOPs' }, { value: '4,800', label: 'MFED images' }],
      methodology: {
        question: 'How can fish-eye images support automated, explainable freshness grading?',
        hypothesis: 'CBAM can focus on iris texture changes while Grad-CAM makes the decision inspectable.',
        method: 'EfficientNet-B0 backbone + CBAM attention + Grad-CAM; MFED dataset with 4,800 images',
        prototype: 'Accepted paper at ICIPAI 2026, the 3rd International Conference on Image Processing and Artificial Intelligence.',
        result: 'Accepted with 99.23% accuracy, outperforming VGG16 and ResNet18 while remaining suitable for mobile deployment.',
        next: 'Upgrade to V2 with LightCRA ring-region attention'
      }
    },
    'multimodal-feeding': {
      ...base['multimodal-feeding']!,
      title: 'Multimodal Feature Fusion for Fish Feeding Intensity Assessment',
      text: 'I fused underwater audio mel-spectrograms with surface video frames through a CNN6–ResNet34 dual branch and SE-Block channel attention for real-time feeding intensity grading.',
      org: 'National Digital Fisheries Innovation Center · Talent Program',
      metrics: [{ value: '91.82%', label: 'Accuracy' }, { value: '7,611', label: 'Sample pairs' }, { value: '+9.25%', label: 'Over audio-only' }, { value: '+3.78%', label: 'Over vision-only' }],
      methodology: {
        question: 'Can multimodal signals reduce feed waste and water pollution caused by imprecise feeding?',
        hypothesis: 'Audio and visual features together can classify feeding intensity more accurately than either modality alone.',
        method: 'CNN6–ResNet34 dual branch + SE-Block channel-attention fusion + 7,611 multimodal sample pairs',
        prototype: 'Experimental validation at the National Digital Fisheries Innovation Center.',
        result: '91.82% test accuracy, exceeding audio-only by 9.25% and image-only by 3.78%.',
        next: 'Expand the dataset and refine fusion strategies'
      }
    },
    'corn-growth': {
      ...base['corn-growth']!,
      title: 'How Exogenous Biostimulants Affect Maize Growth',
      text: 'I tested whether biodegradable biostimulants (COS and γ-PGA) work with fertilizer to improve maize nitrogen use, using 16S rRNA sequencing and random-forest regression to quantify rhizosphere communities.',
      org: 'International conference paper · ICBB 2026',
      metrics: [{ value: '102.9%', label: 'Biomass increase' }, { value: '1% COS', label: 'Best treatment' }, { value: 'Bacillota', label: 'Key phylum' }, { value: '16S rRNA', label: 'Sequencing' }],
      methodology: {
        question: 'Can biodegradable biostimulants work with fertilizer to improve maize nitrogen use, usually below 40%?',
        hypothesis: 'Chitosan oligosaccharide and γ-PGA can improve nitrogen uptake through rhizosphere microbial changes.',
        method: 'Biomass, nutrient accumulation, antioxidant enzymes, and rhizosphere bacteria; 16S rRNA sequencing + random-forest regression',
        prototype: 'Published as an ICBB 2026 conference paper.',
        result: 'The 1% COS treatment increased biomass by 102.9%; Bacillota emerged as a key yield-associated phylum.',
        next: 'Extend to other crops and field trials'
      }
    }
  },
  methods: enMethods,
  groups: [
    { id: 'modeling', label: 'Modeling and explanation', en: 'MODEL / EXPLAIN', description: 'Turn a research question into a testable, inspectable model.', items: [] as Array<{ label: string; en: string; cat: string }> },
    { id: 'delivery', label: 'Engineering and delivery', en: 'SHIP / OPERATE', description: 'Package experimental results into tools that can be deployed, accessed, and iterated.', items: [] as Array<{ label: string; en: string; cat: string }> },
    { id: 'evidence', label: 'Experiments and evidence', en: 'MEASURE / PROVE', description: 'Use datasets, statistical tests, and repeatable experiments to support each conclusion.', items: [] as Array<{ label: string; en: string; cat: string }> }
  ],
  sections: {
    timeline: { label: 'RESEARCH', title: 'Research', accent: 'in motion', copy: 'Five projects, reverse chronological: results, papers, code, and product evidence. Open a methodology panel to follow the reasoning.' },
    toolchain: { label: 'METHODS / WORKBENCH', title: 'Methods and', accent: 'toolchain', copy: 'I treat research as a repeatable loop: define the question, test it with a model, then ship a result people can open.', workbench: 'THE WORKBENCH', workbenchTitle: 'From question to usable result', workbenchCopy: 'Models, engineering, and experiments are one loop that keeps returning to the question.', flowLabel: 'Research workflow', flow: ['Question', 'Model', 'Ship'], footer: ['Research loop active', 'Question → Evidence → Product'] }
  }
} satisfies ResearchLocaleCopy

researchCopy.groups[0]!.items = researchCopy.methods.filter((method) => method.cat === 'DEEP LEARNING' || method.cat === 'EXPLAINABLE AI')
researchCopy.groups[1]!.items = researchCopy.methods.filter((method) => method.cat === 'ENGINEERING')
researchCopy.groups[2]!.items = researchCopy.methods.filter((method) => method.cat === 'SCIENCE')

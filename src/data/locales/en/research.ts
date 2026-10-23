import { research } from '../../research.ts'
import type { ResearchLocaleCopy, ResearchCopy } from '../types.ts'

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
      text: 'I turned FishFreshNet V2 into a zero-install freshness-screening tool: upload a fish-eye image to view its class, confidence, and Grad-CAM heatmap, then export a four-tab A4 PDF report. The tool also provides searchable local history.',
      org: 'Personal project · Hugging Face Spaces + GitHub Pages',
      metrics: [{ value: 'Zero install', label: 'Browser' }, { value: 'Grad-CAM', label: 'Interpretability' }, { value: 'PDF', label: 'Report export' }],
      methodology: {
        question: 'How can a fish-eye image support an accessible, reviewable freshness-screening workflow?',
        hypothesis: 'Combining FishFreshNet V2 classification with Grad-CAM and exportable reports can help users review screening results.',
        method: 'FishFreshNet V2 + Dockerized FastAPI backend on Hugging Face Spaces + responsive GitHub Pages frontend',
        prototype: 'A zero-install web tool: upload a fish-eye image, review its class, confidence, and Grad-CAM heatmap, then export a four-tab A4 PDF report.',
        result: 'Provides searchable local history as an aid to freshness screening, not a replacement for laboratory testing.',
        next: 'Expand validation in real-world settings.'
      }
    },
    'fishfreshnet-v2': {
      ...base['fishfreshnet-v2']!,
      title: 'FishFreshNet V2: A Lightweight and Interpretable Framework for Fish Freshness Classification from Fish-Eye Images with Circular Region Attention',
      text: 'For consistently framed fish-eye crops, I combined LightCRA fixed concentric ring masks and learnable ring weights with ECA channel attention. Across five MFED runs, V2 reached 99.29% accuracy.',
      org: 'Independent research · FishFreshNet V2',
      metrics: [{ value: '99.29%', label: 'Accuracy', note: 'Five MFED runs' }, { value: '4.095M', label: 'Parameters', note: 'V2 model' }, { value: '96.83%', label: 'V2-Lite accuracy' }, { value: '65.5–78.2%', label: 'Forward-pass latency reduction', note: 'V2-Lite vs. corresponding V2 · 7 edge devices' }],
      methodology: {
        question: 'How can consistently framed fish-eye images support lightweight, interpretable freshness classification?',
        hypothesis: 'Fixed concentric masks and learnable ring weights organize fish-eye regions and work with ECA channel attention.',
        method: 'LightCRA fixed concentric ring masks + learnable ring weights + ECA; five MFED runs. Scope: consistently framed fish-eye crops.',
        prototype: 'Implemented in PyTorch and evaluated on MFED; V2 and V2-Lite forward-pass latency was compared on seven edge devices.',
        result: 'Across five MFED runs, V2 reached 99.29% accuracy with 4.095M parameters; V2-Lite reached 96.83% with 0.966M parameters and 0.061G FLOPs. On seven edge devices, V2-Lite reduced forward-pass latency by 65.5%–78.2% relative to the corresponding V2.',
        next: 'Expand FreshEye validation in real-world settings.'
      }
    },
    'fishfreshnet-v1': {
      ...base['fishfreshnet-v1']!,
      title: 'FishFreshNet V1: Lightweight Explainable Assessment with Attention',
      text: 'I built MFED, a 4,800-image dataset covering two freshwater fish, three freshness grades, six collection days, five viewing angles, and four lighting and background conditions; then paired EfficientNet-B0 and CBAM with Grad-CAM.',
      org: 'International conference paper · ICIPAI 2026',
      metrics: [{ value: '99.23%', label: 'Accuracy', note: 'MFED · paper result' }, { value: '4.22M', label: 'Parameters' }, { value: '0.41G', label: 'FLOPs' }, { value: '4,800', label: 'MFED images' }],
      methodology: {
        question: 'How can fish-eye images support automated, explainable freshness grading?',
        hypothesis: 'CBAM can focus on iris texture changes while Grad-CAM makes the decision inspectable.',
        method: 'EfficientNet-B0 backbone + CBAM attention + Grad-CAM; MFED contains 4,800 images across two freshwater fish, three freshness grades, six collection days, five viewing angles, and four lighting and background conditions.',
        prototype: 'Published in the 2026 3rd International Conference on Image Processing and Artificial Intelligence (ICIPAI), pp. 379–383.',
        result: 'The original evaluation reported 99.23% accuracy, 4.22M parameters, and 0.41G FLOPs.',
        next: 'Upgrade to V2 with LightCRA ring-region attention'
      }
    },
    'multimodal-feeding': {
      ...base['multimodal-feeding']!,
      title: 'Multimodal Feature Fusion for Fish Feeding Intensity Assessment',
      text: 'I fused audio mel-spectrograms and images through a CNN6 / ResNet34 dual branch with SE-Block channel attention to classify fish feeding intensity.',
      org: 'National Innovation Center for Digital Fishery · Project of National Science Talent Program',
      metrics: [{ value: '91.82%', label: 'Accuracy' }, { value: '7,611', label: 'MRS-FFIA sample pairs' }, { value: '+9.25 pp', label: 'Over audio-only' }, { value: '+3.78 pp', label: 'Over image-only' }],
      methodology: {
        question: 'Can multimodal signals reduce feed waste and water pollution caused by imprecise feeding?',
        hypothesis: 'Audio and visual features together can classify feeding intensity more accurately than either modality alone.',
        method: '7,611 paired MRS-FFIA samples with mel-spectrograms and images; CNN6 / ResNet34 dual branch + SE-Block, classifying none, weak, moderate, and strong feeding intensity.',
        prototype: 'Research with the National Innovation Center for Digital Fishery and the Project of National Science Talent Program.',
        result: 'Test accuracy was 91.82%, 9.25 percentage points above audio-only and 3.78 percentage points above image-only.',
        next: 'Expand the dataset and refine fusion strategies'
      }
    },
    'corn-growth': {
      ...base['corn-growth']!,
      title: 'The Effects of Different Exogenous Enhancers on Maize Growth and Their Mechanisms',
      text: 'I compared four pot treatments—fertilizer-only control, 0.5% COS, 1% COS, and 0.5% γ-PGA—and analyzed rhizosphere microbiome data with 16S rRNA sequencing and random forest.',
      org: 'International conference paper · ICBB 2026',
      metrics: [{ value: '102.9%', label: 'vs. fertilizer-only control', note: 'Biomass increase with 1% COS' }, { value: '1% COS', label: 'Treatment' }, { value: 'Bacillota', label: 'Random-forest predictor' }, { value: '16S rRNA', label: 'Sequencing' }],
      methodology: {
        question: 'How were maize growth outcomes associated with different exogenous-enhancer treatments?',
        hypothesis: 'Pot treatments with fertilizer alone or paired with enhancers provide a basis for comparing maize growth.',
        method: 'Four pot treatments: fertilizer-only control, 0.5% COS, 1% COS, and 0.5% γ-PGA; measured biomass, nutrient accumulation, antioxidant enzymes, and rhizosphere bacteria using 16S rRNA sequencing and random forest.',
        prototype: 'Published as an ICBB 2026 conference paper.',
        result: 'Relative to the fertilizer-only control, the 1% COS treatment increased biomass by 102.9%. Bacillota was a microbial predictor in the random-forest analysis; this association does not establish causation.',
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

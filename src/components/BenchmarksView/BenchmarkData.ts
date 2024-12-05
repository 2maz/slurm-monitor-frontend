export interface DataDictionary {
  name: string;
  label: string
  [key: string]: number | string
}

export interface Benchmark {
  name: string
  long_title: string
  url: string
}

export const lambdal_benchmark_descriptions: Benchmark[] = [
  {
    name: 'ssd',
    long_title: 'Detection: SSD300 v1.1 For PyTorch',
    url: 'https://github.com/NVIDIA/DeepLearningExamples/tree/master/PyTorch/Detection/SSD'
  },
  {
    name: 'bert_base_squad',
    long_title: 'BERT (Bidirectional Encoder Representations from Transformers) For PyTorch (Using base vocabulary)',
    url: 'https://github.com/NVIDIA/DeepLearningExamples/tree/master/PyTorch/LanguageModeling/BERT'
  },
  {
    name: 'bert_large_squad',
    long_title: 'BERT (Bidirectional Encoder Representations from Transformers) For PyTorch (Using large vocabulary)',
    url: 'https://github.com/NVIDIA/DeepLearningExamples/tree/master/PyTorch/LanguageModeling/BERT'
  },
  {
    name: 'gnmt',
    long_title: 'Translation: GNMT v2 for PyTorch',
    url: 'https://github.com/NVIDIA/DeepLearningExamples/tree/master/PyTorch/Translation/GNMT'
  },
  {
    name: 'ncf',
    long_title: 'Recommendation: Neural Collaborative Filtering (NCF) for PyTorch',
    url: 'https://github.com/NVIDIA/DeepLearningExamples/tree/master/PyTorch/Recommendation/NCF'
  },
  {
    name: 'resnet',
    long_title: 'Classification: ResNet50 v1.5 For PyTorch',
    url: 'https://github.com/NVIDIA/DeepLearningExamples/tree/master/PyTorch/Classification/ConvNets/resnet50v1.5'
  
  },
  {
    name: 'transformerxlbase',
    long_title: 'Language Modeling: Transformer-XL for PyTorch',
    url: 'https://github.com/NVIDIA/DeepLearningExamples/tree/master/PyTorch/LanguageModeling/Transformer-XL',

  },
  {
    name: 'transformerxllarge',
    long_title: 'Language Modeling: Transformer-XL for PyTorch',
    url: 'https://github.com/NVIDIA/DeepLearningExamples/tree/master/PyTorch/LanguageModeling/Transformer-XL',
  },
  {
    name: 'tacotron',
    long_title: 'Speech Synthesis: Tacotron 2 For PyTorch',
    url: 'https://github.com/NVIDIA/DeepLearningExamples/tree/master/PyTorch/SpeechSynthesis/Tacotron2'
  },
  {
    name: 'waveglow',
    long_title: 'Speech Synthesis: WaveGlow v1.10 For PyTorch',
    url: 'https://github.com/NVIDIA/DeepLearningExamples/tree/master/PyTorch/SpeechSynthesis/Tacotron2'
  }
]
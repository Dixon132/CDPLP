# IREC Models Directory

## Structure
```
models/
├── pretrained/       ← Downloaded pre-trained models (Hugging Face)
│   ├── sentiment/    ← Sentiment analysis models
│   ├── emotions/     ← Emotion detection models
│   ├── topics/       ← Topic classification models
│   ├── embeddings/   ← Sentence transformer models
│   └── vision/       ← Vision models (OCR, captioning)
│
├── fine_tuned/       ← Custom fine-tuned models (Tier 2-3)
│
├── baselines/        ← Baseline models (TF-IDF + SVM, etc.)
│
└── model_cards/      ← Documentation for each model
    └── sentiment_model_card.md
```

## Current Status (Tier 1 - Baseline)
All models currently use rule-based/lexicon approaches:
- Sentiment: Spanish lexicon with negation handling
- Emotions: Keyword matching against RISK_INDICATORS
- Topics: Keyword taxonomy with 19 categories
- Risk: Weighted scoring with IREC weights

## Next Steps (Tier 2 - Intermediate)
Requires installing: `torch`, `transformers`, `sentence-transformers`
1. Download `paraphrase-multilingual-MiniLM-L12-v2` for embeddings
2. Download `dccuchile/bert-base-spanish-wwm-uncased` (BETO) for NLP
3. Fine-tune on labeled educational social media corpus
4. Train TF-IDF + SVM baselines for comparison

## Next Steps (Tier 3 - Advanced)
Requires GPU (recommended)
1. Fine-tune BETO for multi-label emotion classification
2. Implement zero-shot topic classification
3. Deploy BLIP-2 for image captioning
4. Integrate EasyOCR for Spanish text extraction

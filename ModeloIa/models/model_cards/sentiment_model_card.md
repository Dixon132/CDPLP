# Model Card: IREC Sentiment Analyzer (Tier 1 - Baseline)

## Model Details
- **Name:** IREC Sentiment Lexicon ES
- **Version:** 0.1.0
- **Type:** Rule-based lexicon sentiment analyzer
- **Language:** Spanish (es)
- **Tier:** 1 (Baseline - no GPU required)

## Intended Use
Sentiment analysis of Spanish-language social media posts from educational communities. Classifies text as positivo, negativo, or neutro.

## Architecture
- Lexicon-based with 270+ Spanish words (150 positive, 120 negative)
- Negation handling with 2-word window
- Intensifier boosting (x1.5 multiplier)
- Score range: -1.0 (negative) to +1.0 (positive)

## Performance
- Zero-shot (no training required)
- Best for: general sentiment in educational social media
- Limitations: sarcasm, irony, very short texts, mixed-language content

## Training Data
N/A (rule-based, no training)

## Ethical Considerations
- Does NOT perform clinical diagnosis
- Designed for aggregate community analysis, not individual assessment
- Lexicon curated to avoid cultural bias in Latin American Spanish

## Future Improvements (Tier 2-3)
- Fine-tuned BETO for Spanish sentiment
- Domain adaptation with educational social media corpus
- Multi-label emotion classification

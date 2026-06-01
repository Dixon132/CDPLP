"""Full pipeline integration test: Fases 1-5."""
from src.irec.schemas import SocialDigitalRecord, Platform, SourceType
from src.irec.ingestion import RedditLoader
from src.irec.preprocessing import PreprocessingPipeline
from src.irec.nlp import NLPPipeline

# Simulate full flow: raw -> SDR -> preprocess -> NLP
raw = {
    "kind": "t3",
    "data": {
        "subreddit": "desahogo",
        "title": "No puedo mas con la universidad",
        "selftext": (
            "Llevo semanas sin dormir por los parciales, estoy agotado, "
            "siento que no voy a poder con este semestre. Mis companeros "
            "no me hablan y me siento solo."
        ),
        "author": "estudiante_anon",
        "created_utc": 1716500000,
        "score": 45,
        "num_comments": 3,
        "link_flair_text": "Desahogo",
    },
}

# Fase 3: Ingest
loader = RedditLoader()
records = loader.parse_item(raw, 0)
print(f"1. INGEST: {len(records)} SDR generated")

# Fase 4: Preprocess
preproc = PreprocessingPipeline()
clean = preproc.process_records([r.model_dump(mode="json") for r in records])
print(f"2. PREPROCESS: {len(clean)} records (spam_removed={preproc.stats['spam_removed']})")

# Fase 5: NLP
nlp = NLPPipeline()
analyzed = nlp.analyze_batch(clean)
print(f"3. NLP: {len(analyzed)} records analyzed")

r = analyzed[0]
print(f"   Sentiment: {r['sentiment_label']} ({r['sentiment_score']})")
print(f"   Dominant emotion: {r['dominant_emotion']}")
print(f"   Risk level: {r['risk_level']} (score={r['overall_risk_score']})")
print(f"   Topics: {r['topics']}")
print(f"   Active risks: {r['active_risks']}")
print(f"   Protective: {r['protective_signals']}")
print("\nFULL PIPELINE INTEGRATION: OK")

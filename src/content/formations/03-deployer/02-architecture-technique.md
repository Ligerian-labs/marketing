# Architecture Technique : Concevoir une Infrastructure IA Robuste

*Module 2 - Durée estimée : 50 minutes*

## Introduction

"Ça marche sur mon laptop" - la phrase qui fait frémir tous les CTO. Entre le prototype qui impressionne en démo et le système en production qui tient la charge, il y a un monde : celui de l'architecture.

Ce module vous donne les clés pour concevoir une infrastructure IA qui scale, résiste aux pannes et reste économiquement viable. Basé sur nos retours d'expérience sur 50+ déploiements en production.

## 1. Choix d'Infrastructure : Cloud, On-Premise, Hybride

### 1.1 Analyse Comparative des Solutions

#### 1.1.1 Cloud Public

**AWS - Leader historique ML/AI**

*Avantages :*
- Écosystème ML le plus mature (SageMaker, Bedrock)
- 25+ types d'instances GPU optimisées
- Services managés complets (reconnaissance, NLP)
- Réseau global, latence optimisée

*Inconvénients :*
- Coûts élevés à grande échelle
- Complexity overhead (100+ services AI)
- Vendor lock-in sur services propriétaires
- Support français limité

*Coûts réels (région eu-west-1) :*
```
p4d.xlarge (1x A100 80GB) : 3.06€/h = 2,200€/mois
p3.2xlarge (1x V100 16GB) : 2.48€/h = 1,786€/mois  
g4dn.xlarge (1x T4 16GB) : 0.43€/h = 310€/mois
Stockage S3 : 0.021€/GB/mois
Transfer out : 0.09€/GB
```

*Use cases optimaux :*
- Startups et scale-ups
- Expérimentations et R&D
- Pics de charge imprévisibles
- Applications B2C globales

**Azure - Intégration Microsoft**

*Avantages :*
- Intégration native Office 365/Teams
- Compliance et certifications européennes
- Azure OpenAI Service (GPT-4, GPT-3.5)
- Support français officiel

*Inconvénients :*
- Écosystème ML moins mature qu'AWS
- Moins de choix GPU/instances
- Performance parfois inférieure
- APIs moins stables

*Coûts réels (région France Central) :*
```
Standard_NC24ads_A100_v4 : 2.90€/h = 2,088€/mois
Standard_NC6s_v3 (1x V100) : 2.15€/h = 1,548€/mois
Standard_NC4as_T4_v3 : 0.38€/h = 274€/mois
```

*Use cases optimaux :*
- Entreprises Microsoft-centric
- Contraintes de localisation française
- Intégration Office/Teams requise
- Conformité RGPD stricte

**Google Cloud Platform - Innovation AI**

*Avantages :*
- Innovations AI de pointe (TPU, Vertex AI)
- Meilleur rapport qualité/prix GPU
- BigQuery ML intégré
- Kubernetes natif

*Inconvénients :*
- Écosystème entreprise moins mature
- Moins de régions européennes
- Support client perfectible
- Stabilité services parfois problématique

*Coûts réels (région europe-west1) :*
```
a2-highgpu-1g (1x A100) : 2.48€/h = 1,786€/mois
n1-standard-4 + 1x T4 : 0.35€/h = 252€/mois
TPU v3 : 6.50€/h = 4,680€/mois (8 cores)
```

*Use cases optimaux :*
- Projets de recherche avancée
- Applications nécessitant TPU
- Architectures cloud-native
- Budgets contraints

#### 1.1.2 Cloud Privé et On-Premise

**Avantages stratégiques :**
- Contrôle total des données
- Pas de limits APIs externes
- Coûts prévisibles long terme
- Conformité maximale

**Inconvénients :**
- Investissement initial massif
- Expertise technique requise
- Maintenance et mises à jour
- Évolutivité complexe

**Coût d'acquisition matériel (2025) :**
```
Serveur DGX Station A100 : 150k€
- 4x A100 80GB
- 256GB RAM DDR4
- 15TB NVMe SSD

Serveur Custom RTX 4090 :
- 8x RTX 4090 24GB : 16k€
- CPU Threadripper : 3k€
- 128GB RAM : 2k€
- Total : ~25k€
```

**ROI Break-even vs Cloud :**
- DGX A100 : 24-30 mois vs équivalent cloud
- Custom RTX : 18-24 mois
- À partir de 70% d'utilisation

### 1.2 Architecture Hybride Recommandée

#### 1.2.1 Répartition Optimale

**On-premise (40%) :**
- Entraînement de modèles propriétaires
- Données sensibles (RH, finance)
- Workloads prédictibles
- R&D interne

**Cloud Public (50%) :**
- Inférence et serving
- Pics de charge
- Expérimentations
- Services managés (APIs)

**Edge (10%) :**
- Applications temps réel
- Contraintes de latence
- IoT et devices
- Résilience réseau

#### 1.2.2 Architecture de Référence

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────┐
│   On-Premise   │    │      Cloud       │    │    Edge     │
├─────────────────┤    ├──────────────────┤    ├─────────────┤
│ • Training      │◄──►│ • Model Registry │◄──►│ • Inference │
│ • Data Lake     │    │ • Auto-scaling   │    │ • IoT       │
│ • Secure Data   │    │ • APIs           │    │ • Real-time │
│ • R&D           │    │ • Monitoring     │    │ • Mobile    │
└─────────────────┘    └──────────────────┘    └─────────────┘
```

**Orchestration :**
- Kubernetes multi-cluster
- GitOps pour déploiements
- Service mesh pour communication
- Observabilité centralisée

## 2. Compute : GPU vs CPU, Dimensionnement, Optimisation

### 2.1 GPU vs CPU : Guide de Décision

#### 2.1.1 Matrice de Décision

| Use Case | GPU Required | CPU Sufficient | Justification |
|----------|-------------|---------------|---------------|
| **Training LLM >1B params** | ✅ Mandatory | ❌ | Parallélisation massive |
| **Fine-tuning** | ✅ Recommended | ⚠️ Possible mais lent | 10-50x plus rapide |
| **Inférence LLM** | ⚠️ Selon volume | ✅ Si <100 req/min | Coût/performance variable |
| **Computer Vision** | ✅ Recommended | ❌ Real-time impossible | Convolutions optimisées |
| **NLP classique** | ❌ Overkill | ✅ Optimal | Transformers simples |
| **Tabular ML** | ❌ Rarely beneficial | ✅ Preferred | XGBoost, Random Forest |

#### 2.1.2 Comparatif Performance/Prix

**Benchmark : Fine-tuning BERT-base (110M paramètres)**

| Hardware | Temps | Coût/h | Coût total | Efficacité |
|----------|--------|---------|------------|------------|
| CPU 32 cores | 8h | 1.20€ | 9.60€ | 1x |
| RTX 4090 | 45min | 2.50€ | 1.88€ | 5.1x |
| A100 80GB | 25min | 3.06€ | 1.28€ | 7.5x |
| H100 | 15min | 8.00€ | 2.00€ | 4.8x |

**Recommandation :** A100 optimal rapport performance/prix pour la plupart des cas

### 2.2 Dimensionnement GPU

#### 2.2.1 Calcul des Besoins Mémoire

**Formule générale :**
```
VRAM (GB) = (Paramètres × Précision × 4) + Gradients + Optimizer States + Activations
```

**Exemples concrets :**

*LLaMA-2 7B (Inférence) :*
```
Paramètres : 7B × 2 bytes (FP16) = 14 GB
+ KV Cache : ~2-4 GB selon context length  
+ Activations : ~1-2 GB
Total : ~18-20 GB → RTX 4090 24GB suffisant
```

*LLaMA-2 7B (Fine-tuning) :*
```
Paramètres : 14 GB
+ Gradients : 14 GB  
+ Adam states : 28 GB
+ Activations : 8 GB
Total : 64 GB → A100 80GB minimum
```

*GPT-3.5 équivalent (175B) :*
```
Inférence FP16 : 350 GB → 8x A100 80GB
Fine-tuning : >1TB → Impossible sans techniques avancées
```

#### 2.2.2 Techniques d'Optimisation Mémoire

**Gradient Checkpointing :**
- Économise 50-80% mémoire activations
- Ralentit training de ~20%
- Quasi-obligatoire pour gros modèles

**Mixed Precision (FP16/BF16) :**
- Divise par 2 l'usage mémoire
- Accélère training de 1.5-2x
- Support natif A100/H100

**Parameter-Efficient Fine-Tuning :**
```
LoRA (Low-Rank Adaptation) :
- Réduit paramètres trainables de 99%
- VRAM requise divisée par 10
- Performance équivalente pour la plupart des tâches

QLoRA (4-bit quantization) :
- Modèles 65B sur RTX 4090 24GB
- Slight accuracy drop (<3%)
- 4x moins de VRAM
```

**DeepSpeed ZeRO :**
- Répartition états optimizer sur plusieurs GPU
- ZeRO-1 : 4x réduction mémoire
- ZeRO-2 : 8x réduction  
- ZeRO-3 : 64x réduction (avec overhead réseau)

### 2.3 Optimisation Coûts Compute

#### 2.3.1 Stratégies Cloud

**Spot Instances :**
- 50-90% moins cher que on-demand
- Risque préemption (backup nécessaire)
- Idéal pour training batch

**Reserved Instances :**
- 30-50% économies sur 1-3 ans
- Capacité garantie
- Optimal pour inférence stable

**Scheduled Scaling :**
```python
# Auto-scaling basé sur métriques business
if hour in [9, 17]:  # Pics d'usage
    target_instances = 5
elif hour in [0, 6]:  # Heures creuses
    target_instances = 1
else:
    target_instances = 3
```

#### 2.3.2 Monitoring et Alerting

**Métriques clés :**
- GPU Utilization (target >80%)
- Memory Usage (alert >90%)  
- Queue Time (alert >30s)
- Cost per inference (trend analysis)

**Dashboard exemple :**
```
┌─────────────────────────────────────┐
│ GPU Cluster Status                  │
├─────────────────────────────────────┤
│ • Utilization: 87% (↗ +5%)         │
│ • Queue: 12s avg (⚠ above target)  │
│ • Cost/1k requests: 0.45€ (↘ -8%)  │
│ • Error rate: 0.02% (✅ normal)     │
└─────────────────────────────────────┘
```

## 3. Hébergement de Modèles

### 3.1 Solutions Managed vs Self-Hosted

#### 3.1.1 Comparatif Solutions Managed

**AWS SageMaker :**
```
Avantages :
+ Auto-scaling natif
+ A/B testing intégré  
+ Multi-model endpoints
+ Monitoring CloudWatch

Inconvénients :
- Coût élevé (2-3x self-hosted)
- Vendor lock-in
- Latence API supplémentaire
- Customisation limitée

Coûts :
ml.g4dn.xlarge : 0.626€/h + 0.12€/10k requests
ml.p3.2xlarge : 4.24€/h + 0.12€/10k requests
```

**Azure ML :**
```
Avantages :
+ Intégration Azure ecosystem
+ Responsible AI dashboard
+ AutoML capabilities

Inconvénients :
- Plus cher qu'AWS
- Moins de features avancées
- Performance variable

Coûts :
Standard_NC6s_v3 : 2.15€/h + requests
```

**Google Vertex AI :**
```
Avantages :
+ Prix competitive
+ TPU access
+ BigQuery integration

Inconvénients :
- Écosystème moins mature
- Documentation lacunaire

Coûts :
n1-standard-4 + T4 : 0.35€/h + 0.09€/10k requests
```

#### 3.1.2 Solutions Self-Hosted

**TorchServe :**
```yaml
# Configuration production
apiVersion: apps/v1
kind: Deployment
metadata:
  name: torchserve-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: torchserve
  template:
    spec:
      containers:
      - name: torchserve
        image: pytorch/torchserve:latest
        resources:
          requests:
            memory: "4Gi"
            nvidia.com/gpu: 1
          limits:
            memory: "8Gi"
            nvidia.com/gpu: 1
        env:
        - name: TS_WORKERS_PER_MODEL
          value: "2"
```

*Avantages :*
- Contrôle total
- Coût variable selon usage
- Customisation maximale
- Pas de vendor lock-in

*Inconvénients :*
- Setup et maintenance complexes
- Scaling manuel
- Monitoring à implémenter
- Expertise DevOps requise

**TensorFlow Serving :**
```dockerfile
FROM tensorflow/serving:latest

COPY models/ /models/
ENV MODEL_NAME=my_model
ENV MODEL_BASE_PATH=/models

# Configuration optimisée
ENV TF_ENABLE_BATCHING=true
ENV TF_SERVING_BATCHING_PARAMETERS_FILE=/opt/tensorflow_serving/batching_config.txt
```

**Triton Inference Server (NVIDIA) :**
- Support multi-frameworks (PyTorch, TF, ONNX)
- Optimisations GPU avancées
- Dynamic batching intelligent
- Concurrent model execution

### 3.2 Architecture de Serving Haute Performance

#### 3.2.1 Pattern Load Balancing

```
                    ┌─────────────────┐
            ┌──────►│ GPU Instance 1  │
            │       │ Model A + B     │
┌─────────┐ │       └─────────────────┘
│Load     │ │       ┌─────────────────┐
│Balancer │──┼──────►│ GPU Instance 2  │
│(nginx)  │ │       │ Model A + B     │
└─────────┘ │       └─────────────────┘
            │       ┌─────────────────┐
            └──────►│ GPU Instance 3  │
                    │ Model A + B     │
                    └─────────────────┘
```

**Configuration nginx optimisée :**
```nginx
upstream model_servers {
    least_conn;
    server gpu-1:8080 weight=3;
    server gpu-2:8080 weight=3;  
    server gpu-3:8080 weight=2 backup;
}

location /predict {
    proxy_pass http://model_servers;
    proxy_connect_timeout 2s;
    proxy_send_timeout 10s;
    proxy_read_timeout 30s;
}
```

#### 3.2.2 Optimisations Latence

**Model Quantization :**
```python
# INT8 quantization post-training
import torch.quantization as quantization

model_fp32 = torch.load('model.pth')
model_fp32.eval()

# Configuration quantization
model_fp32.qconfig = quantization.get_default_qconfig('fbgemm')
model_prepared = quantization.prepare(model_fp32)

# Calibration avec données représentatives
calibrate_model(model_prepared, calibration_data)

# Conversion INT8
model_int8 = quantization.convert(model_prepared)

# Résultats typiques :
# Taille : -75%
# Latence : -40%  
# Accuracy : -2%
```

**Dynamic Batching :**
```python
class DynamicBatcher:
    def __init__(self, max_batch_size=32, timeout_ms=50):
        self.max_batch_size = max_batch_size
        self.timeout_ms = timeout_ms
        self.queue = []
        
    async def add_request(self, request):
        self.queue.append(request)
        
        if len(self.queue) >= self.max_batch_size:
            return await self.process_batch()
        
        # Wait for timeout or batch full
        await asyncio.wait_for(self.wait_batch(), timeout=self.timeout_ms/1000)
        return await self.process_batch()
```

**Résultats mesurés :**
- Sans batching : 50ms/request, 20 RPS
- Avec batching : 80ms/batch de 8, 100 RPS
- Throughput amélioré de 400%

### 3.3 Multi-Model Serving

#### 3.3.1 Stratégies de Déploiement

**Approche 1 : Modèles séparés**
```
Pod 1: NLP Model      (2 GB VRAM)
Pod 2: Vision Model   (4 GB VRAM)  
Pod 3: Recom Model    (1 GB VRAM)
```

*Avantages :* Isolation, scaling indépendant
*Inconvénients :* Overhead mémoire, sous-utilisation

**Approche 2 : Co-location intelligente**
```
Pod 1: NLP + Recom     (3 GB VRAM)
Pod 2: Vision seul     (4 GB VRAM)
```

*Avantages :* Meilleure utilisation GPU
*Inconvénients :* Interference potentielle

**Approche 3 : Model multiplexing**
```python
class ModelMultiplexer:
    def __init__(self):
        self.models = {}
        self.current_model = None
        
    def load_model(self, model_id):
        if self.current_model != model_id:
            torch.cuda.empty_cache()
            self.current_model = self.models[model_id].cuda()
            
    def predict(self, model_id, input_data):
        self.load_model(model_id)
        return self.current_model(input_data)
```

*Usage : Modèles utilisés séquentiellement, économie mémoire*

## 4. Bases de Données Vectorielles

### 4.1 Comparatif Solutions

#### 4.1.1 Solutions Managées

**Pinecone :**
```python
import pinecone

# Setup
pinecone.init(api_key="xxx", environment="us-east-1-aws")
index = pinecone.Index("embeddings-index")

# Upsert vectors
vectors = [
    ("id1", [0.1, 0.2, 0.3, ...], {"text": "doc content"}),
    ("id2", [0.4, 0.5, 0.6, ...], {"text": "autre doc"})
]
index.upsert(vectors)

# Query
results = index.query(
    vector=[0.1, 0.2, 0.3, ...],
    top_k=10,
    include_metadata=True
)
```

*Avantages :*
- Setup instantané
- Auto-scaling
- Performance excellente
- APIs simples

*Inconvénients :*
- Coût élevé (0.096€/1M queries)
- Vendor lock-in
- Pas de contrôle infrastructure
- Limitations customisation

*Coûts réels :*
```
p1.x1 pod : 70€/mois (100k vectors)
p1.x2 pod : 140€/mois (500k vectors)
Queries : 0.096€/1M requests
Storage : 0.25€/GB/mois
```

**Weaviate Cloud :**
```python
import weaviate

client = weaviate.Client("https://cluster-url.weaviate.network")

# Schema definition
schema = {
    "classes": [{
        "class": "Document",
        "vectorizer": "text2vec-openai",
        "properties": [
            {"name": "content", "dataType": ["text"]},
            {"name": "title", "dataType": ["string"]}
        ]
    }]
}

# Vector search avec filtres
result = client.query\
    .get("Document", ["content", "title"])\
    .with_near_text({"concepts": ["machine learning"]})\
    .with_where({"path": ["category"], "operator": "Equal", "valueString": "tech"})\
    .with_limit(5)\
    .do()
```

*Avantages :*
- Open source + managed
- Rich filtering capabilities
- Multi-modal support
- GraphQL API

*Inconvénients :*
- Plus complexe que Pinecone
- Performance variable
- Documentation perfectible

#### 4.1.2 Solutions Self-Hosted

**pgvector (PostgreSQL) :**
```sql
-- Installation extension
CREATE EXTENSION vector;

-- Table avec embeddings
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding VECTOR(1536)  -- OpenAI ada-002 size
);

-- Index pour performance
CREATE INDEX ON documents 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 1000);

-- Recherche similarité
SELECT content, 1 - (embedding <=> '[0.1,0.2,0.3,...]') AS similarity
FROM documents
ORDER BY embedding <=> '[0.1,0.2,0.3,...]'
LIMIT 10;
```

*Avantages :*
- Intégration PostgreSQL native
- ACID compliance
- Coût minimal (PostgreSQL standard)
- SQL queries familières

*Inconvénients :*
- Performance limitée (>1M vectors)
- Pas d'optimisations vectorielles avancées
- Scaling vertical principalement

**ChromaDB :**
```python
import chromadb

# Local persistent client
client = chromadb.PersistentClient(path="./chroma_db")
collection = client.create_collection("documents")

# Add documents
collection.add(
    documents=["Document 1 content", "Document 2 content"],
    embeddings=[[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
    metadatas=[{"source": "web"}, {"source": "pdf"}],
    ids=["id1", "id2"]
)

# Query
results = collection.query(
    query_embeddings=[[0.1, 0.2, 0.3]],
    n_results=10,
    where={"source": "web"}
)
```

*Avantages :*
- Simple deployment
- Python native
- Active development
- Lightweight

*Inconvénients :*
- Écosystème jeune
- Performance non éprouvée à grande échelle
- Features limitées vs solutions matures

### 4.2 Dimensionnement et Performance

#### 4.2.1 Benchmarks Performance

**Test : 1M vectors 1536 dimensions**

| Solution | Index Time | Query Latency P95 | QPS | Memory Usage |
|----------|------------|------------------|-----|--------------|
| **Pinecone** | - (managed) | 45ms | 2,000 | - (managed) |
| **Weaviate** | 12 min | 120ms | 800 | 8GB |
| **pgvector** | 25 min | 300ms | 200 | 12GB |
| **ChromaDB** | 8 min | 80ms | 1,200 | 6GB |

**Test : 10M vectors 1536 dimensions**

| Solution | Query Latency P95 | QPS | Memory Usage |
|----------|------------------|-----|--------------|
| **Pinecone** | 52ms | 1,800 | - |
| **Weaviate** | 180ms | 600 | 80GB |
| **pgvector** | 1,200ms | 50 | 120GB |
| **ChromaDB** | 250ms | 400 | 60GB |

#### 4.2.2 Optimisation Performances

**Indexing Strategies :**

*HNSW (Hierarchical Navigable Small World) :*
```python
# Weaviate HNSW config
"vectorIndexConfig": {
    "distance": "cosine",
    "efConstruction": 128,  # Build time precision
    "maxConnections": 32,   # Memory vs accuracy tradeoff
    "ef": 64                # Query time precision
}
```

*IVF (Inverted File) :*
```sql
-- pgvector IVF config
CREATE INDEX ON embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 1000);  -- Clusters count

-- Recommandation : lists = rows / 1000
```

**Memory Management :**
```python
# Batch processing pour large datasets
def process_embeddings_batch(vectors, batch_size=1000):
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i+batch_size]
        yield index.upsert(batch)
        time.sleep(0.1)  # Rate limiting
```

### 4.3 Architecture Vector Database

#### 4.3.1 Pattern Multi-Index

```
                    ┌─────────────────┐
                    │ Application     │
                    └─────────┬───────┘
                              │
                    ┌─────────▼───────┐
                    │ Vector Router   │
                    └─────────┬───────┘
           ┌─────────────┬────┴───┬─────────────┐
           │             │        │             │
    ┌──────▼──────┐ ┌────▼────┐ ┌─▼─────────┐ ┌─▼──────┐
    │ Documents   │ │ Images  │ │ Products  │ │ Users  │
    │ Index       │ │ Index   │ │ Index     │ │ Index  │
    └─────────────┘ └─────────┘ └───────────┘ └────────┘
```

**Avantages :**
- Isolation par type de contenu
- Scaling indépendant
- Sécurité granulaire
- Performance optimisée

#### 4.3.2 Hybrid Search Architecture

```python
class HybridSearchEngine:
    def __init__(self):
        self.vector_db = pinecone.Index("vectors")
        self.text_db = elasticsearch.Elasticsearch()
        
    def search(self, query, alpha=0.7):
        # Vector search
        vector_results = self.vector_db.query(
            vector=self.embed(query),
            top_k=20
        )
        
        # Text search  
        text_results = self.text_db.search(
            index="documents",
            body={"query": {"match": {"content": query}}}
        )
        
        # Fusion des résultats
        return self.rank_fusion(vector_results, text_results, alpha)
```

*Résultats mesurés :*
- Vector seul : 0.72 NDCG@10
- Text seul : 0.68 NDCG@10
- Hybrid : 0.84 NDCG@10

## 5. Pipelines de Données et MLOps

### 5.1 Architecture MLOps de Référence

#### 5.1.1 Data Pipeline

```
Raw Data → Ingestion → Validation → Transformation → Feature Store → Training/Inference
```

**Apache Airflow DAG exemple :**
```python
from airflow import DAG
from airflow.operators.python_operator import PythonOperator

def extract_data():
    # Extraction depuis sources (DB, APIs, files)
    pass

def validate_data():
    # Data quality checks
    # Schema validation  
    # Anomaly detection
    pass

def transform_data():
    # Feature engineering
    # Normalization
    # Aggregations
    pass

dag = DAG(
    'ml_data_pipeline',
    default_args={'retries': 2},
    schedule_interval='@daily',
    max_active_runs=1
)

extract = PythonOperator(
    task_id='extract',
    python_callable=extract_data,
    dag=dag
)

validate = PythonOperator(
    task_id='validate',
    python_callable=validate_data,
    dag=dag
)

transform = PythonOperator(
    task_id='transform',
    python_callable=transform_data,
    dag=dag
)

extract >> validate >> transform
```

#### 5.1.2 Model Lifecycle

```
Data → Training → Validation → Registry → Deployment → Monitoring → Retraining
```

**MLflow Integration :**
```python
import mlflow
import mlflow.pytorch

# Training avec logging
with mlflow.start_run():
    model = train_model(train_data)
    
    # Log parameters
    mlflow.log_param("learning_rate", lr)
    mlflow.log_param("batch_size", batch_size)
    
    # Log metrics
    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_metric("f1_score", f1)
    
    # Log model
    mlflow.pytorch.log_model(model, "model")
    
    # Register best model
    if accuracy > best_accuracy:
        mlflow.register_model(
            model_uri=f"runs:/{mlflow.active_run().info.run_id}/model",
            name="production_model"
        )
```

### 5.2 CI/CD pour Modèles

#### 5.2.1 GitOps Pipeline

```yaml
# .github/workflows/model-deploy.yml
name: Model Deployment Pipeline

on:
  push:
    paths:
      - 'models/**'
      - 'data/**'

jobs:
  test-model:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Python
      uses: actions/setup-python@v2
      with:
        python-version: 3.9
        
    - name: Install dependencies
      run: pip install -r requirements.txt
      
    - name: Run model tests
      run: |
        pytest tests/test_model.py
        python scripts/validate_model.py
        
    - name: Performance benchmarks
      run: python scripts/benchmark.py
      
  deploy-staging:
    needs: test-model
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to staging
      run: |
        kubectl apply -f k8s/staging/
        kubectl rollout status deployment/model-server
        
    - name: Integration tests
      run: python scripts/integration_tests.py
      
  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - name: Blue-green deployment
      run: |
        ./scripts/blue_green_deploy.sh
        ./scripts/health_check.sh
```

#### 5.2.2 Model Testing Framework

```python
# tests/test_model.py
import pytest
import torch
from src.model import MyModel

class TestModel:
    @pytest.fixture
    def model(self):
        return MyModel.load_from_checkpoint("model.ckpt")
        
    def test_model_output_shape(self, model):
        input_tensor = torch.randn(1, 784)
        output = model(input_tensor)
        assert output.shape == (1, 10)
        
    def test_model_performance(self, model):
        accuracy = evaluate_model(model, test_dataset)
        assert accuracy > 0.85, f"Model accuracy {accuracy} below threshold"
        
    def test_model_bias(self, model):
        # Test sur différents sous-groupes
        for group in ["male", "female", "young", "old"]:
            group_accuracy = evaluate_group(model, group)
            assert group_accuracy > 0.80, f"Bias detected for {group}"
            
    def test_model_latency(self, model):
        import time
        start = time.time()
        for _ in range(100):
            model(torch.randn(1, 784))
        avg_latency = (time.time() - start) / 100
        assert avg_latency < 0.05, f"Latency {avg_latency}s too high"
```

### 5.3 Monitoring et Observabilité

#### 5.3.1 Métriques Clés

**Performance Metrics :**
```python
# Latence
histogram_latency = Histogram(
    'model_inference_duration_seconds',
    'Time spent on inference',
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 5.0)
)

# Throughput  
counter_requests = Counter(
    'model_requests_total',
    'Total model requests',
    ['model_name', 'version']
)

# Erreurs
counter_errors = Counter(
    'model_errors_total', 
    'Total model errors',
    ['error_type']
)

# Usage GPU
gauge_gpu_utilization = Gauge(
    'gpu_utilization_percent',
    'GPU utilization percentage'
)
```

**Data Drift Detection :**
```python
from evidently import ColumnMapping
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset

def detect_drift(reference_data, current_data):
    report = Report(metrics=[DataDriftPreset()])
    
    column_mapping = ColumnMapping()
    column_mapping.target = 'target'
    column_mapping.numerical_features = ['feature1', 'feature2']
    column_mapping.categorical_features = ['category']
    
    report.run(
        reference_data=reference_data,
        current_data=current_data,
        column_mapping=column_mapping
    )
    
    drift_score = report.get_metric("DatasetDriftMetric").drift_score
    
    if drift_score > 0.3:
        trigger_retraining_alert()
        
    return drift_score
```

#### 5.3.2 Dashboard Opérationnel

**Grafana Dashboard JSON :**
```json
{
  "dashboard": {
    "title": "ML Model Monitoring",
    "panels": [
      {
        "title": "Model Latency P95",
        "type": "stat",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, model_inference_duration_seconds_bucket)",
            "legendFormat": "P95 Latency"
          }
        ]
      },
      {
        "title": "Request Rate", 
        "type": "graph",
        "targets": [
          {
            "expr": "rate(model_requests_total[5m])",
            "legendFormat": "{{model_name}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "singlestat", 
        "targets": [
          {
            "expr": "rate(model_errors_total[5m]) / rate(model_requests_total[5m]) * 100"
          }
        ]
      }
    ]
  }
}
```

## Points Clés à Retenir

✅ **Hybride par défaut** : 40% on-premise, 50% cloud, 10% edge selon les contraintes

✅ **GPU ROI** : A100 80GB optimal rapport performance/prix, RTX 4090 pour budgets contraints

✅ **Serving strategy** : TorchServe/Triton self-hosted pour contrôle, managed pour simplicité

✅ **Vector DB** : Pinecone pour simplicité, pgvector pour intégration, ChromaDB pour cost

✅ **MLOps obligatoire** : Pipeline automatisé indispensable dès le 2ème modèle en production

**L'architecture technique n'est pas un choix définitif, c'est une évolution continue adaptée à la croissance de vos usages IA.**

---

**Prochaine étape :** [LLM en Production](./03-llm-production.md) - Industrialiser les modèles de langage avec sécurité et performance →
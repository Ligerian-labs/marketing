# Chapitre 6 : Sécurité & Éthique

*Temps de lecture estimé : 45 minutes*

## Introduction : L'IA Responsable n'est plus Optionnelle

L'intelligence artificielle peut créer une valeur immense, mais elle peut aussi introduire des risques considérables : biais discriminatoires, violations de la vie privée, manipulation de l'opinion, ou cyberattaques sophistiquées. Dans un contexte réglementaire de plus en plus strict (EU AI Act, RGPD), déployer une IA sécurisée et éthique n'est plus une option, c'est une obligation légale et business.

Ce chapitre vous donne les outils pour :
- **Sécuriser** vos modèles contre les attaques et vulnérabilités
- **Détecter et mitiger** les biais algorithmiques
- **Implémenter** la conformité EU AI Act
- **Construire** un cadre d'IA responsable
- **Organiser** la gouvernance éthique

## 🛡️ Sécurité des Modèles IA

### Typologie des Menaces

```
                    ┌─────────────────────────┐
                    │     THREAT LANDSCAPE    │
                    └─────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌─────────┐           ┌─────────┐           ┌─────────┐
   │ TRAINING│           │INFERENCE│           │ OUTPUT  │
   │  PHASE  │           │  PHASE  │           │  PHASE  │
   └─────────┘           └─────────┘           └─────────┘
        │                     │                     │
    • Data poisoning      • Adversarial attacks   • Model theft
    • Model inversion     • Prompt injection      • Data leakage
    • Backdoor attacks    • Input manipulation    • Hallucinations
```

**1. Attaques sur les Données d'Entraînement**

**Data Poisoning :**
- **Description** : Injection de données malveillantes pour corrompre l'apprentissage
- **Impact** : Modèle biaisé, comportements non désirés
- **Mitigation** :
  ```python
  # Contrôle de qualité automatisé
  def validate_training_data(dataset):
      checks = {
          'outlier_detection': detect_statistical_outliers(dataset),
          'label_consistency': check_label_quality(dataset),
          'source_validation': verify_data_provenance(dataset),
          'bias_detection': analyze_demographic_bias(dataset)
      }
      return all(checks.values())
  ```

**Model Inversion :**
- **Description** : Reconstitution de données privées à partir du modèle
- **Mitigation** : Differential Privacy, federated learning

**2. Attaques à l'Inférence**

**Adversarial Attacks :**
```python
# Détection d'attaques adversariales
class AdversarialDefense:
    def __init__(self, model, threshold=0.1):
        self.model = model
        self.threshold = threshold
        self.detector = self._build_detector()
    
    def detect_adversarial_input(self, input_data):
        # Analyse de gradient pour détecter les perturbations
        gradient_norm = tf.norm(tf.gradients(
            self.model.predict(input_data), input_data
        ))
        
        # Prédictions multiples avec augmentation
        predictions = []
        for _ in range(10):
            augmented = self._augment_input(input_data)
            predictions.append(self.model.predict(augmented))
        
        variance = tf.math.reduce_variance(predictions)
        
        return gradient_norm > self.threshold or variance > self.threshold
```

**Prompt Injection (pour LLMs) :**
```python
# Framework de protection contre l'injection de prompts
class PromptGuardian:
    def __init__(self):
        self.dangerous_patterns = [
            r'ignore.*previous.*instructions',
            r'system.*prompt.*is',
            r'act.*as.*if.*you.*are',
            r'pretend.*to.*be'
        ]
        self.content_filter = self._load_content_filter()
    
    def sanitize_prompt(self, user_input):
        # Détection de patterns d'injection
        for pattern in self.dangerous_patterns:
            if re.search(pattern, user_input.lower()):
                return self._safe_response()
        
        # Filtrage du contenu
        if self.content_filter.is_harmful(user_input):
            return self._moderated_response()
        
        return self._safe_format(user_input)
```

### Framework de Sécurité IA

**Matrice de Classification des Risques :**

| Type de Modèle | Risque Confidentiel | Risque Intégrité | Risque Disponibilité | Mesures Prioritaires |
|----------------|---------------------|------------------|---------------------|---------------------|
| **LLM Public** | Moyen | Élevé | Moyen | Guardrails, modération |
| **Modèle Propriétaire** | Élevé | Élevé | Élevé | Chiffrement, accès contrôlé |
| **IA Critique** | Critique | Critique | Critique | Audit continu, failsafe |

**Plan de Sécurisation en 4 Phases :**

```
Phase 1: ASSESSMENT
├── Audit sécuritaire des modèles existants
├── Classification des actifs IA
├── Analyse des vecteurs d'attaque
└── Évaluation des impacts business

Phase 2: HARDENING
├── Implémentation des contrôles d'accès
├── Chiffrement des données et modèles
├── Mise en place de guardrails
└── Formation des équipes

Phase 3: MONITORING
├── Détection d'anomalies en temps réel
├── Logging des interactions IA
├── Alerting automatisé
└── Tableaux de bord sécurité

Phase 4: RESPONSE
├── Procédures d'incident response
├── Plans de continuité d'activité
├── Communication de crise
└── Post-mortem et amélioration continue
```

## ⚖️ Détection et Mitigation des Biais

### Types de Biais Algorithmiques

**1. Biais de Représentation**
- **Définition** : Sous ou sur-représentation de certains groupes dans les données
- **Exemple** : Système RH qui discrimine les femmes car entraîné sur un historique majoritairement masculin
- **Détection** :
  ```python
  def analyze_representation_bias(dataset, protected_attribute):
      groups = dataset.groupby(protected_attribute)
      representation = groups.size() / len(dataset)
      
      # Test de disparité statistique
      min_representation = representation.min()
      max_representation = representation.max()
      
      disparity_ratio = min_representation / max_representation
      
      return {
          'representation': representation,
          'disparity_ratio': disparity_ratio,
          'is_biased': disparity_ratio < 0.8  # Règle des 80%
      }
  ```

**2. Biais de Performance**
- **Définition** : Différences de performance du modèle selon les groupes
- **Métriques** :
  ```python
  class FairnessMetrics:
      @staticmethod
      def demographic_parity(y_true, y_pred, sensitive_attr):
          """Égalité des taux de prédiction positive"""
          groups = np.unique(sensitive_attr)
          positive_rates = {}
          
          for group in groups:
              mask = sensitive_attr == group
              positive_rates[group] = np.mean(y_pred[mask])
          
          return positive_rates
      
      @staticmethod
      def equalized_odds(y_true, y_pred, sensitive_attr):
          """Égalité des taux de vrais/faux positifs"""
          from sklearn.metrics import confusion_matrix
          
          groups = np.unique(sensitive_attr)
          metrics = {}
          
          for group in groups:
              mask = sensitive_attr == group
              tn, fp, fn, tp = confusion_matrix(
                  y_true[mask], y_pred[mask]
              ).ravel()
              
              metrics[group] = {
                  'tpr': tp / (tp + fn),  # Sensibilité
                  'fpr': fp / (fp + tn)   # 1 - Spécificité
              }
          
          return metrics
  ```

### Stratégies de Mitigation

**1. Preprocessing (Données)**
```python
# Resampling pour équilibrer la représentation
from imblearn.over_sampling import SMOTE
from aif360.algorithms.preprocessing import Reweighing

def mitigate_representation_bias(dataset, protected_attr):
    # Option 1: SMOTE pour sur-échantillonnage
    smote = SMOTE(random_state=42)
    X_resampled, y_resampled = smote.fit_resample(
        dataset.features, dataset.labels
    )
    
    # Option 2: Reweighing pour pondération
    reweigher = Reweighing(
        unprivileged_groups=[{protected_attr: 0}],
        privileged_groups=[{protected_attr: 1}]
    )
    
    return reweigher.fit_transform(dataset)
```

**2. In-Processing (Modèle)**
```python
# Entraînement avec contrainte de fairness
import tensorflow as tf

class FairClassifier:
    def __init__(self, fairness_penalty=0.1):
        self.fairness_penalty = fairness_penalty
    
    def fair_loss(self, y_true, y_pred, sensitive_attr):
        # Loss de classification standard
        classification_loss = tf.keras.losses.binary_crossentropy(
            y_true, y_pred
        )
        
        # Pénalité de fairness (demographic parity)
        groups = tf.unique(sensitive_attr)[0]
        fairness_loss = 0
        
        for i in range(len(groups)):
            for j in range(i+1, len(groups)):
                mask_i = tf.equal(sensitive_attr, groups[i])
                mask_j = tf.equal(sensitive_attr, groups[j])
                
                rate_i = tf.reduce_mean(y_pred[mask_i])
                rate_j = tf.reduce_mean(y_pred[mask_j])
                
                fairness_loss += tf.abs(rate_i - rate_j)
        
        return classification_loss + self.fairness_penalty * fairness_loss
```

**3. Post-Processing (Résultats)**
```python
# Ajustement des seuils par groupe
class FairnessPostProcessor:
    def __init__(self, strategy='equalized_odds'):
        self.strategy = strategy
        self.thresholds = {}
    
    def fit(self, y_true, y_scores, sensitive_attr):
        groups = np.unique(sensitive_attr)
        
        if self.strategy == 'equalized_odds':
            # Optimiser les seuils pour égaliser TPR/FPR
            for group in groups:
                mask = sensitive_attr == group
                self.thresholds[group] = self._optimize_threshold(
                    y_true[mask], y_scores[mask]
                )
    
    def predict(self, y_scores, sensitive_attr):
        predictions = np.zeros_like(y_scores)
        
        for group in np.unique(sensitive_attr):
            mask = sensitive_attr == group
            threshold = self.thresholds.get(group, 0.5)
            predictions[mask] = (y_scores[mask] > threshold).astype(int)
        
        return predictions
```

## 📋 EU AI Act : Implications Pratiques

### Classification des Systèmes IA

```
                    ┌─────────────────────────┐
                    │       EU AI ACT         │
                    │    RISK CLASSIFICATION  │
                    └─────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌─────────┐           ┌─────────┐           ┌─────────┐
   │PROHIBITED│          │HIGH RISK│           │LIMITED/ │
   │   RISK   │          │  RISK   │           │MINIMAL  │
   └─────────┘           └─────────┘           └─────────┘
        │                     │                     │
  • Subliminal           • Biometric ID         • Chatbots
  • Social Scoring       • Critical Infra       • Emotion Rec
  • Real-time            • Education           • Deep Fakes
    surveillance         • Employment          (transparency)
                         • Law Enforcement
```

**Matrice de Conformité :**

| Catégorie | Exemples | Obligations | Sanctions | Actions Requis |
|-----------|----------|-------------|-----------|----------------|
| **Prohibé** | Social scoring, subliminal | Interdiction totale | 35M€ ou 7% CA | Arrêt immédiat |
| **Haut Risque** | RH, crédit, diagnostic | Certification, audit | 15M€ ou 3% CA | Système qualité complet |
| **Risque Limité** | Chatbots | Transparence | 7.5M€ ou 1.5% CA | Information utilisateurs |
| **Minimal** | Spam filter | Aucune | - | Surveillance volontaire |

### Framework de Conformité

**1. Évaluation et Classification**
```python
class AIActCompliance:
    def __init__(self):
        self.risk_assessment_framework = {
            'application_domain': self._assess_domain,
            'user_impact': self._assess_impact,
            'decision_autonomy': self._assess_autonomy,
            'data_sensitivity': self._assess_data_sensitivity
        }
    
    def classify_ai_system(self, system_description):
        risk_scores = {}
        
        for criterion, assessment_func in self.risk_assessment_framework.items():
            risk_scores[criterion] = assessment_func(system_description)
        
        overall_risk = self._calculate_overall_risk(risk_scores)
        
        if overall_risk >= 0.8:
            return 'HIGH_RISK'
        elif overall_risk >= 0.4:
            return 'LIMITED_RISK'
        else:
            return 'MINIMAL_RISK'
```

**2. Documentation et Traçabilité**
```yaml
# Template de documentation AI Act
ai_system_documentation:
  system_identification:
    name: "Système de Recommandation Produits"
    version: "2.1.0"
    provider: "VotreEntreprise SAS"
    intended_purpose: "Recommandations personnalisées e-commerce"
    
  risk_classification:
    category: "LIMITED_RISK"
    assessment_date: "2024-03-15"
    next_review: "2024-09-15"
    
  technical_documentation:
    data_sources:
      - name: "Historique Achats"
        sensitivity: "Personal"
        retention: "24 mois"
      - name: "Comportement Navigation"
        sensitivity: "Behavioral"
        retention: "12 mois"
        
    algorithms:
      - type: "Collaborative Filtering"
        fairness_measures: ["Demographic Parity"]
        bias_mitigation: ["Reweighing", "Threshold Optimization"]
        
    performance_metrics:
      accuracy: 0.87
      fairness_score: 0.92
      bias_variance: 0.05
      
  human_oversight:
    oversight_level: "Human-on-the-loop"
    intervention_capability: "Override recommendations"
    monitoring_frequency: "Weekly"
    
  risk_management:
    identified_risks:
      - risk: "Discrimination par âge"
        probability: "Low"
        impact: "Medium"
        mitigation: "Audit mensuel + seuils ajustés"
```

## 🎯 IA Responsable et Explicabilité

### Framework d'Explicabilité

**Niveaux d'Explicabilité :**

| Niveau | Public | Techniques | Use Cases |
|--------|--------|-------------|-----------|
| **Global** | Développeurs | SHAP, LIME, PDP | Debug, amélioration modèle |
| **Local** | Utilisateurs | Feature importance, counterfactuals | Décisions individuelles |
| **Exemples** | Métier | Similar cases, rule extraction | Formation, audit |
| **Contrafactuel** | Concernés | "Et si...", sensibilité | Recours, amélioration |

**Implémentation Technique :**

```python
import shap
import lime
from sklearn.inspection import permutation_importance

class ExplainabilityEngine:
    def __init__(self, model, model_type='tree'):
        self.model = model
        self.model_type = model_type
        self.explainer = self._setup_explainer()
    
    def _setup_explainer(self):
        if self.model_type == 'tree':
            return shap.TreeExplainer(self.model)
        elif self.model_type == 'linear':
            return shap.LinearExplainer(self.model)
        else:
            return shap.KernelExplainer(self.model.predict, self.background_data)
    
    def explain_prediction(self, instance, explanation_type='local'):
        if explanation_type == 'local':
            return self._local_explanation(instance)
        elif explanation_type == 'global':
            return self._global_explanation()
        elif explanation_type == 'counterfactual':
            return self._counterfactual_explanation(instance)
    
    def _local_explanation(self, instance):
        """Explication pour une prédiction spécifique"""
        shap_values = self.explainer.shap_values(instance)
        
        explanation = {
            'prediction': self.model.predict([instance])[0],
            'confidence': self.model.predict_proba([instance])[0].max(),
            'feature_importance': dict(zip(
                self.feature_names, shap_values[0]
            )),
            'top_factors': self._get_top_factors(shap_values[0])
        }
        
        return explanation
    
    def _counterfactual_explanation(self, instance):
        """Qu'est-ce qui changerait la décision ?"""
        current_prediction = self.model.predict([instance])[0]
        
        counterfactuals = []
        for feature_idx, feature_name in enumerate(self.feature_names):
            modified_instance = instance.copy()
            
            # Test des modifications de feature
            for delta in [-0.1, -0.5, 0.1, 0.5]:
                modified_instance[feature_idx] = instance[feature_idx] * (1 + delta)
                new_prediction = self.model.predict([modified_instance])[0]
                
                if new_prediction != current_prediction:
                    counterfactuals.append({
                        'feature': feature_name,
                        'original_value': instance[feature_idx],
                        'new_value': modified_instance[feature_idx],
                        'new_prediction': new_prediction
                    })
        
        return counterfactuals
```

### Templates d'Explication Utilisateur

```python
class UserExplanationGenerator:
    def generate_explanation(self, prediction_result, user_type='end_user'):
        if user_type == 'end_user':
            return self._generate_citizen_explanation(prediction_result)
        elif user_type == 'expert':
            return self._generate_expert_explanation(prediction_result)
        
    def _generate_citizen_explanation(self, result):
        return f"""
        **Décision:** {result['decision']}
        
        **Principaux facteurs:**
        {self._format_main_factors(result['feature_importance'])}
        
        **Que pouvez-vous faire ?**
        {self._generate_actionable_advice(result['counterfactuals'])}
        
        **Recours:** Si vous contestez cette décision, contactez notre service client
        avec le code de référence {result['reference_id']}.
        """
    
    def _format_main_factors(self, importance_scores):
        sorted_factors = sorted(
            importance_scores.items(), 
            key=lambda x: abs(x[1]), 
            reverse=True
        )[:3]
        
        explanations = []
        for factor, score in sorted_factors:
            impact = "favorable" if score > 0 else "défavorable"
            strength = "fortement" if abs(score) > 0.3 else "modérément"
            
            explanations.append(f"• {factor}: impact {strength} {impact}")
        
        return "\n".join(explanations)
```

## 🏛️ Gouvernance Éthique

### Structure de Gouvernance

```
                    ┌─────────────────────────┐
                    │   COMITÉ ÉTHIQUE IA     │
                    │   (C-Level + Experts)   │
                    └─────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
         ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
         │   POLICY    │ │  TECHNICAL  │ │  BUSINESS   │
         │   WORKGROUP │ │  WORKGROUP  │ │  WORKGROUP  │
         └─────────────┘ └─────────────┘ └─────────────┘
                │             │             │
            • Legal        • Data Sci     • Product
            • Ethics       • ML Eng       • Sales
            • Privacy      • Security     • Marketing
            • Compliance   • Audit        • HR
```

**Charte Éthique IA (Template) :**

```yaml
charte_ethique_ia:
  principles:
    transparency:
      description: "Nos systèmes IA sont explicables et auditables"
      implementation:
        - Documentation publique des algorithmes utilisés
        - Interfaces d'explication pour les utilisateurs
        - Audit externe annuel des modèles critiques
        
    fairness:
      description: "Nos IA ne discriminent pas"
      implementation:
        - Tests de biais systématiques avant déploiement
        - Monitoring continu des métriques de fairness
        - Processus de recours pour les décisions automatisées
        
    privacy:
      description: "Respect de la vie privée by design"
      implementation:
        - Minimisation des données collectées
        - Anonymisation et pseudonymisation
        - Differential privacy pour les modèles sensibles
        
    human_agency:
      description: "L'humain garde le contrôle"
      implementation:
        - Supervision humaine des décisions critiques
        - Possibilité d'override pour tous les systèmes
        - Formation des utilisateurs aux limites de l'IA
        
  governance:
    comite_ethique:
      composition: "5 membres : CTO, Legal, Privacy Officer, Expert externe, Représentant métier"
      frequency: "Mensuel + sessions ad-hoc"
      responsabilities:
        - Validation des nouveaux projets IA
        - Audit des systèmes en production
        - Mise à jour des politiques éthiques
        
    processus_validation:
      etapes:
        1. "Évaluation impact éthique (EIE)"
        2. "Review technique par l'équipe IA"
        3. "Validation légale et conformité"
        4. "Approbation comité éthique"
        5. "Monitoring post-déploiement"
        
  metrics:
    fairness_score: "> 0.9"
    bias_variance: "< 0.1"
    explainability_coverage: "100% décisions critiques"
    user_satisfaction_ethics: "> 4.2/5"
```

### Process d'Évaluation d'Impact Éthique

```python
class EthicalImpactAssessment:
    def __init__(self):
        self.assessment_criteria = {
            'fairness': self._assess_fairness,
            'transparency': self._assess_transparency,
            'privacy': self._assess_privacy,
            'autonomy': self._assess_human_autonomy,
            'accountability': self._assess_accountability
        }
    
    def conduct_assessment(self, ai_system_spec):
        assessment_results = {}
        
        for criterion, assessment_func in self.assessment_criteria.items():
            score, recommendations = assessment_func(ai_system_spec)
            assessment_results[criterion] = {
                'score': score,  # 1-5
                'recommendations': recommendations
            }
        
        overall_score = np.mean([r['score'] for r in assessment_results.values()])
        
        return {
            'overall_score': overall_score,
            'detailed_results': assessment_results,
            'recommendation': self._get_recommendation(overall_score),
            'required_actions': self._get_required_actions(assessment_results)
        }
    
    def _assess_fairness(self, system_spec):
        score = 3  # Default neutral
        recommendations = []
        
        if 'bias_testing' in system_spec.quality_assurance:
            score += 1
        else:
            recommendations.append("Implémenter des tests de biais systématiques")
        
        if 'protected_attributes' in system_spec.data_description:
            if system_spec.data_description['protected_attributes']:
                recommendations.append("Attention aux attributs protégés identifiés")
            else:
                score += 1
        
        return score, recommendations
```

## 📊 Métriques et Monitoring Éthique

### Dashboard Éthique

```python
class EthicsMonitoringDashboard:
    def __init__(self):
        self.metrics_config = {
            'fairness_metrics': [
                'demographic_parity',
                'equalized_odds',
                'calibration'
            ],
            'explainability_metrics': [
                'feature_importance_stability',
                'explanation_coverage',
                'user_understanding_score'
            ],
            'privacy_metrics': [
                'data_minimization_score',
                'anonymization_quality',
                'consent_compliance'
            ]
        }
    
    def generate_weekly_report(self):
        report = {
            'period': f"{datetime.now() - timedelta(days=7)} - {datetime.now()}",
            'systems_monitored': self._get_active_systems(),
            'alerts': self._get_ethics_alerts(),
            'metrics_summary': self._calculate_metrics_summary(),
            'recommendations': self._generate_recommendations()
        }
        
        return report
    
    def _get_ethics_alerts(self):
        alerts = []
        
        # Vérification des seuils de fairness
        for system in self.active_systems:
            fairness_score = self._calculate_fairness_score(system)
            if fairness_score < 0.8:
                alerts.append({
                    'severity': 'HIGH',
                    'system': system.name,
                    'type': 'FAIRNESS_VIOLATION',
                    'description': f"Score de fairness: {fairness_score:.2f}",
                    'action_required': "Audit immédiat et correction du modèle"
                })
        
        return alerts
```

## 🎯 Actions Immédiates

### Checklist de Conformité (90 jours)

```markdown
## Phase 1: AUDIT (Jours 1-30)
- [ ] Inventaire de tous les systèmes IA en production
- [ ] Classification selon EU AI Act
- [ ] Évaluation des risques éthiques existants
- [ ] Audit sécurité des modèles critiques
- [ ] Analyse des biais sur les systèmes de décision

## Phase 2: GOVERNANCE (Jours 31-60)
- [ ] Création du comité éthique IA
- [ ] Rédaction de la charte éthique
- [ ] Mise en place des processus de validation
- [ ] Formation des équipes aux enjeux éthiques
- [ ] Implémentation du monitoring éthique

## Phase 3: REMEDIATION (Jours 61-90)
- [ ] Correction des biais identifiés
- [ ] Mise en place des systèmes d'explication
- [ ] Renforcement de la sécurité des modèles
- [ ] Documentation de conformité EU AI Act
- [ ] Plan de communication sur l'IA responsable
```

### ROI de l'IA Éthique

| Investissement | Coût (% budget IA) | Bénéfices | ROI Estimé |
|----------------|-------------------|-----------|------------|
| **Compliance EU AI Act** | 15-25% | Éviter amendes, market access | 300-500% |
| **Bias Detection** | 8-12% | Réduction risque légal, image | 200-400% |
| **Security Hardening** | 10-15% | Éviter breaches, IP theft | 500-1000% |
| **Explainability** | 5-10% | Confiance utilisateur, adoption | 150-300% |

---

*L'IA éthique et sécurisée n'est pas un coût, c'est un investissement dans la durabilité de votre transformation digitale. Les entreprises qui l'intègrent dès maintenant prendront une avance décisive sur leurs concurrents.*

**Prochaine étape :** [Chapitre 7 : Cas d'Études](07-cas-etudes.md) pour voir ces principes appliqués dans des contextes réels.
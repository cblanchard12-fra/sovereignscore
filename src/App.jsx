import { useState, useMemo } from "react";
import { supabase } from "./supabase";

/* ============================================================
   SOUVERAINSCORE — Prototype v0.1 du diagnostic gratuit
   Direction artistique « papeterie souveraine » :
   encre / papier / garance — évoque la France institutionnelle
   SANS imiter le DSFR ni la fonte Marianne (usage réservé à
   l'État — CGU DSFR, systeme-de-design.gouv.fr).
   Typo display : Spectral (SIL OFL, Production Type, Paris).
   ============================================================ */

const C = {
  encre: "#111D33",      // bleu nuit — texte, fonds sombres
  encre2: "#1B2A47",
  papier: "#F6F3EC",     // fond principal
  papier2: "#EEEADF",
  outremer: "#24439B",   // interactif
  garance: "#A4243B",    // alertes uniquement (le "rouge" tricolore, jamais décoratif)
  acier: "#5A6373",      // texte secondaire
  ligne: "#D8D2C4",
  ocre: "#B07C2E",
  orange: "#E2581C",   // accent marque — wordmark SouverainScore uniquement
  bronze: "#2F6B4F",
};

const FONT = `
@import url('https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
.ss-serif { font-family: 'Spectral', Georgia, serif; }
.ss-sans { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
.ss-tnum { font-variant-numeric: tabular-nums; }
@media (prefers-reduced-motion: reduce) { .ss-anim { transition: none !important; animation: none !important; } }
`;

/* ---------- Signature : liseré tricolore (3 filets fins, jamais en aplat) ---------- */
const Lisere = ({ vertical = false, size = 44 }) => (
  <div
    aria-hidden="true"
    style={{
      display: "flex",
      flexDirection: vertical ? "column" : "row",
      width: vertical ? 3 : size,
      height: vertical ? size : 3,
      flexShrink: 0,
    }}
  >
    <div style={{ flex: 1, background: C.encre }} />
    <div style={{ flex: 1, background: "#FFFFFF", border: `0.5px solid ${C.ligne}` }} />
    <div style={{ flex: 1, background: C.garance }} />
  </div>
);

/* ============================ DONNÉES ============================ */

const AXES = {
  A1: "Hébergement & localisation",
  A2: "Juridiction & extraterritorialité",
  A3: "Dépendances & réversibilité",
  A4: "Sécurité & conformité",
  A5: "Contrats & clauses",
  A6: "Autonomie opérationnelle",
  A7: "IA & données sensibles",
  A8: "Gouvernance & stratégie",
};

const PROFILAGE = [
  {
    id: "P-01",
    texte: "Quel est le statut de votre organisation ?",
    multiple: false,
    opts: [
      { l: "Collectivité territoriale ou établissement public local", v: "collectivite" },
      { l: "Administration / autre acteur public", v: "public_autre" },
      { l: "PME (moins de 250 salariés)", v: "pme" },
      { l: "ETI (250 à 4 999 salariés)", v: "eti" },
      { l: "Grande entreprise", v: "ge" },
      { l: "Association / autre", v: "autre" },
    ],
  },
  {
    id: "P-02",
    texte: "Votre organisation est-elle concernée par l'un de ces cadres ?",
    note: "Plusieurs réponses possibles.",
    multiple: true,
    opts: [
      { l: "Secteur santé (données de santé → hébergement HDS)", v: "hds" },
      { l: "Secteur financier (banque, assurance, mutuelle → DORA)", v: "dora" },
      { l: "Opérateur de services essentiels / d'importance vitale (OSE/OIV)", v: "ose_oiv" },
      { l: "Fournisseur ou sous-traitant d'un OSE/OIV", v: "fournisseur_oiv" },
      { l: "Entité essentielle ou importante au sens de NIS2 (ou incertitude)", v: "nis2" },
      { l: "Aucun de ces cadres, à ma connaissance", v: "aucun" },
      { l: "Je ne sais pas", v: "nsp" },
    ],
    ref: "Directive (UE) 2022/2555 (NIS2) ; règlement (UE) 2022/2554 (DORA) ; art. L.1111-8 CSP (HDS)",
  },
  {
    id: "P-03",
    texte: "Quel est l'effectif de votre organisation ?",
    multiple: false,
    opts: [
      { l: "Moins de 50 salariés / agents", v: "lt50" },
      { l: "50 à 249", v: "50_249" },
      { l: "250 à 999", v: "250_999" },
      { l: "1 000 et plus", v: "gte1000" },
    ],
    ref: "Directive (UE) 2022/2555, art. 2 (seuils de taille)",
  },
];

const QUESTIONS = [
  {
    id: "A1-G1", axe: "A1", p: 3, candidate: true,
    texte: "Savez-vous précisément où sont hébergées vos données les plus critiques (pays, fournisseur, sous-traitants d'hébergement) ?",
    opts: [
      { l: "Oui, cartographie documentée et à jour, y compris sauvegardes", s: 4 },
      { l: "Oui pour les systèmes principaux, mais pas les sauvegardes ni les sous-traitants", s: 2 },
      { l: "Partiellement, informations dispersées et non vérifiées", s: 1 },
      { l: "Non / je ne sais pas", s: 0 },
    ],
    ref: "RGPD art. 30 (registre des traitements) ; art. 44-49 (transferts hors UE)",
    alerte: {
      titre: "Vous ne savez pas où sont vos données",
      corps: "Sans cartographie de l'hébergement (production, sauvegardes, sous-traitants), aucune démarche de souveraineté ni de conformité RGPD n'est pilotable : le registre des traitements exigé par l'art. 30 du RGPD suppose de connaître les destinataires et les localisations. C'est le prérequis de tout le reste.",
      action: "Quick win : établir une cartographie des 5 systèmes les plus critiques (fournisseur, pays, sous-traitants, sauvegardes) — 2 à 4 semaines, sans budget externe.",
    },
  },
  {
    id: "A1-G2", axe: "A1", p: 2,
    texte: "Vos outils collaboratifs principaux (messagerie, bureautique, partage de documents) sont fournis par :",
    opts: [
      { l: "Un éditeur UE, avec hébergement en UE contractualisé", s: 4 },
      { l: "Un éditeur non-UE, mais avec hébergement en UE", s: 2 },
      { l: "Un éditeur non-UE, hébergement hors UE ou non précisé", s: 0 },
      { l: "Je ne sais pas", s: 0 },
    ],
    ref: "CJUE, Schrems II (C-311/18) ; doctrine « cloud au centre » (circ. n°6404-SG) pour le public",
  },
  {
    id: "A2-G1", axe: "A2", p: 3, candidate: true,
    texte: "Vos fournisseurs cloud et SaaS principaux sont-ils soumis à des législations extraterritoriales (Cloud Act américain, FISA 702) du fait de leur actionnariat ou de leur maison-mère ?",
    opts: [
      { l: "Non : fournisseurs vérifiés comme immunisés (ex. SecNumCloud 3.2, actionnariat UE contrôlé)", s: 4 },
      { l: "Oui pour certains, mais exposition analysée et mesures en place", s: 2 },
      { l: "Oui, sans analyse ni mesure particulière", s: 1 },
      { l: "Je ne sais pas", s: 0 },
    ],
    ref: "US CLOUD Act (2018) ; FISA section 702 ; référentiel SecNumCloud 3.2 (ANSSI)",
    alerte: {
      titre: "Exposition extraterritoriale non maîtrisée",
      corps: "Un fournisseur dont la maison-mère relève du droit américain peut être contraint de communiquer des données aux autorités des États-Unis, y compris lorsqu'elles sont hébergées en Europe (US CLOUD Act, 2018 ; FISA 702). La localisation UE ne suffit donc pas : c'est précisément le risque jugé par la CJUE dans Schrems II (C-311/18). Le référentiel SecNumCloud 3.2 de l'ANSSI intègre des exigences de protection contre le droit extra-européen.",
      action: "Recenser l'actionnariat et la juridiction de vos 5 fournisseurs critiques ; pour les données sensibles, exiger une offre qualifiée SecNumCloud ou des mesures compensatoires (chiffrement à clés maîtrisées).",
    },
  },
  {
    id: "A2-G2", axe: "A2", p: 2,
    texte: "Avez-vous connaissance des sous-traitants ultérieurs de vos fournisseurs (qui héberge réellement, qui assure le support, depuis quel pays) ?",
    opts: [
      { l: "Oui, liste contractuelle des sous-traitants ultérieurs, tenue à jour", s: 4 },
      { l: "Partiellement, pour le fournisseur principal uniquement", s: 2 },
      { l: "Non / je ne sais pas", s: 0 },
    ],
    ref: "RGPD art. 28.2 et 28.4 (sous-traitants ultérieurs)",
  },
  {
    id: "A3-G1", axe: "A3", p: 2,
    texte: "Pour votre fournisseur numérique le plus critique, disposez-vous d'un plan de sortie (format d'export, coût, délai, alternative identifiée) ?",
    opts: [
      { l: "Oui, plan documenté et testé (export réellement effectué)", s: 4 },
      { l: "Oui, plan documenté mais jamais testé", s: 3 },
      { l: "Réflexion engagée, rien de formalisé", s: 1 },
      { l: "Non / je ne sais pas", s: 0 },
    ],
    ref: "Règlement (UE) 2022/2554 (DORA), art. 28 — stratégies de sortie (finance)",
  },
  {
    id: "A3-G2", axe: "A3", p: 2,
    texte: "Combien de vos services numériques essentiels dépendent d'un fournisseur unique sans alternative identifiée ?",
    opts: [
      { l: "Aucun : alternatives identifiées pour chaque service essentiel", s: 4 },
      { l: "Un ou deux services concernés", s: 2 },
      { l: "La majorité de nos services essentiels", s: 1 },
      { l: "Tous, ou je ne sais pas", s: 0 },
    ],
    ref: "DORA art. 29 (risque de concentration TIC) ; principe transposable",
  },
  {
    id: "A4-G1", axe: "A4", p: 3, candidate: true,
    texte: "Vos hébergeurs et fournisseurs cloud critiques disposent-ils de qualifications vérifiables (SecNumCloud, ISO 27001, HDS si données de santé) ?",
    opts: [
      { l: "Oui, vérifiées sur les listes officielles (ANSSI, certificateurs HDS) et exigées contractuellement", s: 4 },
      { l: "Oui selon leurs déclarations commerciales, sans vérification officielle", s: 2 },
      { l: "Non, ou certifications expirées / de périmètre inconnu", s: 1 },
      { l: "Je ne sais pas", s: 0 },
    ],
    ref: "Référentiel SecNumCloud 3.2 et liste des offres qualifiées (cyber.gouv.fr) ; HDS, art. L.1111-8 CSP",
    alerte: {
      titre: "Qualifications fournisseurs non vérifiées",
      corps: "Une certification déclarée dans une plaquette commerciale n'est pas une garantie : périmètre, validité et niveau doivent être vérifiés sur les listes officielles (offres qualifiées SecNumCloud publiées par l'ANSSI, registres des certificateurs HDS). L'écart entre « déclaré » et « vérifié » est la première cause de fausse assurance constatée dans les audits.",
      action: "Vérifier chaque certification revendiquée sur la source officielle et exiger l'attestation en annexe contractuelle, avec périmètre explicite.",
    },
  },
  {
    id: "A4-G2", axe: "A4", p: 2,
    texte: "Votre organisation a-t-elle analysé si elle est assujettie à NIS2 (ou DORA pour le secteur financier), et engagé les actions correspondantes ?",
    opts: [
      { l: "Oui : assujettissement analysé, plan en cours ou non-assujettissement documenté", s: 4 },
      { l: "Assujettissement identifié, mais pas de plan d'action", s: 2 },
      { l: "Analyse non faite alors que le secteur ou la taille le justifierait", s: 1 },
      { l: "Je ne sais pas de quoi il s'agit", s: 0 },
    ],
    ref: "Directive (UE) 2022/2555, art. 2-3 ; règlement (UE) 2022/2554",
  },
  {
    id: "A5-G1", axe: "A5", p: 2,
    texte: "Vos contrats cloud principaux contiennent-ils une clause de localisation des données dans l'UE couvrant aussi les sauvegardes et le support ?",
    opts: [
      { l: "Oui, y compris sauvegardes et accès du support", s: 4 },
      { l: "Oui, mais périmètre partiel ou incertain", s: 2 },
      { l: "Non", s: 1 },
      { l: "Je ne sais pas / contrats jamais analysés sous cet angle", s: 0 },
    ],
    ref: "RGPD art. 28.3 (contrat de sous-traitance) ; art. 44-49",
  },
  {
    id: "A5-G2", axe: "A5", p: 1,
    texte: "Si votre fournisseur principal modifie unilatéralement ses conditions (prix, CGU, localisation), vos contrats prévoient-ils notification préalable et droit de sortie sans pénalité ?",
    opts: [
      { l: "Oui, clauses vérifiées", s: 4 },
      { l: "Probablement, mais jamais vérifié", s: 1 },
      { l: "Non / je ne sais pas", s: 0 },
    ],
    ref: "Bonne pratique contractuelle ; CCAG-TIC pour les acheteurs publics",
  },
  {
    id: "A6-G1", axe: "A6", p: 2,
    texte: "Vos équipes (internes ou prestataire de proximité) peuvent-elles exporter vos données et administrer vos systèmes critiques sans dépendre du support de l'éditeur ?",
    opts: [
      { l: "Oui : compétences internes, exports testés", s: 4 },
      { l: "En partie : certaines opérations exigent l'éditeur", s: 2 },
      { l: "Non : dépendance totale au support éditeur", s: 1 },
      { l: "Je ne sais pas", s: 0 },
    ],
    ref: "Axe autonomie du référentiel — mapping CSF (Commission européenne) en cours",
  },
  {
    id: "A6-G2", axe: "A6", p: 1,
    texte: "Disposez-vous d'une documentation à jour de vos systèmes critiques (architecture, configurations, dépendances, comptes d'administration) ?",
    opts: [
      { l: "Oui, à jour et accessible hors des outils du fournisseur concerné", s: 4 },
      { l: "Oui mais obsolète ou détenue par un seul sachant", s: 2 },
      { l: "Non / je ne sais pas", s: 0 },
    ],
    ref: "Guide d'hygiène informatique (ANSSI)",
  },
  {
    id: "A7-G1", axe: "A7", p: 2, candidate: true,
    texte: "Vos collaborateurs utilisent-ils des assistants IA génératifs (ChatGPT, Copilot, Gemini…) avec des données internes, et cet usage est-il encadré ?",
    opts: [
      { l: "Usage encadré par une doctrine interne (outils autorisés, données interdites, sensibilisation)", s: 4 },
      { l: "Aucun usage, vérifié", s: 3 },
      { l: "Usage connu et toléré, sans doctrine formalisée", s: 1 },
      { l: "Usage probable mais non suivi (« shadow AI »)", s: 0 },
    ],
    ref: "Recommandations CNIL sur les systèmes d'IA (cnil.fr) ; RGPD art. 5 et 32",
    alerte: {
      titre: "Fuite de données par les usages IA non encadrés",
      corps: "Des données internes saisies dans un assistant IA grand public quittent votre périmètre : localisation du traitement, conservation et réutilisation dépendent des conditions de l'éditeur. Sans doctrine (outils autorisés, catégories de données interdites, sensibilisation), l'exposition est invisible et quotidienne. La CNIL publie des recommandations dédiées aux systèmes d'IA ; les principes de minimisation et de sécurité du RGPD (art. 5 et 32) s'appliquent.",
      action: "Quick win : publier une doctrine IA d'une page (outils autorisés / données interdites) et la faire signer — coût nul, effet immédiat.",
    },
  },
  {
    id: "A7-G2", axe: "A7", p: 1,
    texte: "Pour les fonctions IA intégrées à vos outils SaaS existants, savez-vous où sont traitées les données et si elles servent à l'entraînement des modèles ?",
    opts: [
      { l: "Oui, vérifié contractuellement, options d'exclusion activées", s: 4 },
      { l: "Vérifié partiellement, pour l'outil principal", s: 2 },
      { l: "Non / je ne sais pas / fonctions activées par défaut sans analyse", s: 0 },
    ],
    ref: "RGPD art. 13-14 et 28 ; documentation contractuelle de chaque éditeur",
  },
  {
    id: "A8-G1", axe: "A8", p: 2,
    texte: "Existe-t-il une politique ou une orientation « souveraineté numérique » portée par la direction (sponsor identifié, arbitrages, budget) ?",
    opts: [
      { l: "Oui : politique formalisée, sponsor, revue périodique", s: 4 },
      { l: "Orientation affirmée mais non formalisée", s: 2 },
      { l: "Sujet jamais porté au niveau direction", s: 1 },
      { l: "Je ne sais pas", s: 0 },
    ],
    ref: "Doctrine « cloud au centre » (circ. n°6404-SG du 31/05/2023) pour le public",
  },
  {
    id: "A8-G2", axe: "A8", p: 2,
    texte: "Les critères de souveraineté (localisation, qualifications, réversibilité) sont-ils intégrés dans vos achats numériques ?",
    opts: [
      { l: "Oui : grille de critères systématique dans les consultations", s: 4 },
      { l: "Parfois, selon les projets et les personnes", s: 2 },
      { l: "Jamais / je ne sais pas", s: 0 },
    ],
    ref: "Code de la commande publique ; doctrine « cloud au centre » pour le public",
  },
];

/* ---------- Blocs de préconisation (variante courte pour le diagnostic ;
   la version longue vit dans Airtable et alimente le rapport payant) ---------- */
const PREC = {
  "PREC-A1-01": {
    titre: "Cartographier l'hébergement réel de vos données",
    horizon: "Quick win",
    contenu: "Sans savoir où sont vos données — fournisseur, pays, sous-traitants, sauvegardes comprises — rien n'est pilotable, et le registre des traitements du RGPD (art. 30) l'exige déjà. Première action : un tableau des 5 à 10 systèmes critiques, en distinguant ce qui est contractualisé de ce qui est seulement déclaré. Quelques semaines, sans budget externe.",
    refs: "RGPD art. 30 et 44-49 (eur-lex.europa.eu)",
    domaines: ["GRC / cartographie SI", "Conseil & accompagnement"],
  },
  "PREC-A1-02": {
    titre: "Bâtir une trajectoire pour les outils du quotidien",
    horizon: "Structurant",
    contenu: "Messagerie et collaboratif concentrent vos données vivantes ; l'hébergement en Europe ne neutralise pas à lui seul l'exposition à un droit tiers (CJUE, Schrems II). Pas de migration précipitée : une trajectoire — alternatives évaluées à chaque renouvellement, pilote sur une direction, critères documentés.",
    refs: "CJUE C-311/18 ; doctrine « cloud au centre » (circ. n°6404-SG) ; SILL (code.gouv.fr)",
    domaines: ["Collaboratif", "Messagerie", "GED"],
  },
  "PREC-A2-01": {
    titre: "Analyser l'exposition extraterritoriale de vos fournisseurs critiques",
    horizon: "6-12 mois",
    contenu: "Le critère n'est pas la localisation du datacenter mais la chaîne de contrôle du fournisseur : une maison-mère de droit américain peut être contrainte de remettre des données, même hébergées en Europe (CLOUD Act, FISA 702). Recensez juridiction et actionnariat de vos 5 fournisseurs critiques ; pour les données sensibles, privilégiez une offre qualifiée SecNumCloud ou un chiffrement à clés maîtrisées.",
    refs: "US CLOUD Act (2018) ; FISA 702 ; SecNumCloud 3.2 et offres qualifiées (cyber.gouv.fr)",
    domaines: ["Cloud qualifié", "Chiffrement & gestion de clés"],
  },
  "PREC-A2-02": {
    titre: "Reprendre la main sur la chaîne de sous-traitance",
    horizon: "Quick win",
    contenu: "Votre fournisseur doit pouvoir produire la liste de ses sous-traitants ultérieurs, rôle et localisation compris — support inclus (RGPD art. 28). Première action sans coût : la demander formellement à vos fournisseurs principaux. Un fournisseur incapable de la fournir rapidement est en soi un signal.",
    refs: "RGPD art. 28.2 et 28.4 (eur-lex.europa.eu)",
    domaines: ["GRC / conformité", "Conseil juridique numérique"],
  },
  "PREC-A3-01": {
    titre: "Formaliser un plan de sortie pour le fournisseur le plus critique",
    horizon: "6-12 mois",
    contenu: "Un plan de sortie démontre que la migration resterait possible à coût et délai connus — DORA en fait une obligation dans la finance (art. 28). Contenu minimal : procédure d'export testée une fois réellement, volumétrie, clauses de réversibilité, alternative identifiée, coût estimé. Une fiche de 2-3 pages, revue chaque année.",
    refs: "Règlement (UE) 2022/2554 (DORA), art. 28",
    domaines: ["Sauvegarde & réversibilité", "Conseil & accompagnement"],
  },
  "PREC-A3-02": {
    titre: "Réduire la concentration fournisseur",
    horizon: "Structurant",
    contenu: "Quand identité, messagerie et métier reposent sur un même fournisseur, chaque incident devient systémique et le pouvoir de négociation disparaît (risque de concentration — DORA art. 29). Réponse : pas de dé-concentration brutale, mais une politique d'architecture — au minimum une sauvegarde externalisée chez un tiers indépendant, et un critère de diversification dans les achats.",
    refs: "Règlement (UE) 2022/2554 (DORA), art. 29",
    domaines: ["Sauvegarde", "Cloud IaaS/PaaS", "Identité & accès"],
  },
  "PREC-A4-01": {
    titre: "Vérifier chaque qualification sur les listes officielles",
    horizon: "Quick win",
    contenu: "Une certification en plaquette commerciale n'engage à rien : seuls comptent la source officielle, le périmètre exact et la validité. Les vérifications sont gratuites : liste des offres qualifiées SecNumCloud (ANSSI), hébergeurs certifiés HDS (ANS). Vérifiez, exigez l'attestation en annexe contractuelle, notez la date.",
    refs: "Offres qualifiées SecNumCloud (cyber.gouv.fr) ; HDS, art. L.1111-8 CSP (esante.gouv.fr)",
    domaines: ["Cloud qualifié", "Hébergement santé (HDS)", "GRC / conformité"],
  },
  "PREC-A4-02": {
    titre: "Clarifier votre situation face à NIS2 (et DORA)",
    horizon: "Quick win",
    contenu: "Ne pas savoir si l'on est concerné est le risque principal : les obligations NIS2 (gestion des risques, notification d'incidents, responsabilité de la direction) demandent des mois de préparation. Une demi-journée suffit pour passer les critères de l'art. 2 (secteur + taille) et documenter la conclusion — même négative.",
    refs: "Directive (UE) 2022/2555, art. 2-3 et 20-23 ; transposition FR : cyber.gouv.fr",
    domaines: ["GRC / conformité", "Cyber", "Conseil & accompagnement"],
  },
  "PREC-A5-01": {
    titre: "Contractualiser la localisation — sauvegardes et support compris",
    horizon: "6-12 mois",
    contenu: "Une localisation UE affichée sur un site n'a pas de valeur si le contrat ne la garantit pas ; et une clause limitée à la production laisse hors champ sauvegardes et accès du support, souvent opérés depuis des pays tiers. Relisez les contrats critiques sous ce seul angle ; aux renouvellements, exigez une clause couvrant l'ensemble (RGPD art. 28.3).",
    refs: "RGPD art. 28.3 et 44-49 ; recommandations EDPB 01/2020 (edpb.europa.eu)",
    domaines: ["Conseil juridique numérique", "GRC / conformité"],
  },
  "PREC-A5-02": {
    titre: "Encadrer les évolutions unilatérales et sécuriser la sortie",
    horizon: "6-12 mois",
    contenu: "Sans clause de notification préalable et de droit de sortie sans pénalité, vous subissez chaque modification de CGU — prix, périmètre, localisation. Aux renouvellements : notification 60-90 jours, résiliation sans frais en cas de modification défavorable, assistance à réversibilité à tarif plafonné. Ces clauses coûtent peu avant signature, très cher après.",
    refs: "CCAG-TIC, arrêté du 30/03/2021 modifié (legifrance.gouv.fr)",
    domaines: ["Conseil juridique numérique", "Achats"],
  },
  "PREC-A6-01": {
    titre: "Restaurer une capacité d'action indépendante du fournisseur",
    horizon: "Structurant",
    contenu: "Quand ni l'export ni l'administration courante ne se font sans le support de l'éditeur, la dépendance est opérationnelle — aucune clause ne compense l'absence de savoir-faire. Identifiez les 3-5 opérations vitales (export complet, restauration, gestion des accès), documentez-les, exécutez-les une fois par an en conditions réelles.",
    refs: "ANSSI, Guide d'hygiène informatique (cyber.gouv.fr)",
    domaines: ["Infogérance de proximité", "Formation", "Sauvegarde & réversibilité"],
  },
  "PREC-A6-02": {
    titre: "Documenter les systèmes critiques hors des outils du fournisseur",
    horizon: "Quick win",
    contenu: "Une documentation obsolète, détenue par un seul sachant ou stockée dans l'outil qu'elle décrit ne sert à rien le jour venu. Socle minimal : schéma d'architecture, inventaire des comptes d'administration, dépendances, contacts fournisseurs — stocké ailleurs que dans les systèmes décrits, revu à date fixe, connu de deux personnes au moins.",
    refs: "ANSSI, Guide d'hygiène informatique (cyber.gouv.fr)",
    domaines: ["GED", "ITSM", "Infogérance de proximité"],
  },
  "PREC-A7-01": {
    titre: "Publier une doctrine d'usage des IA génératives",
    horizon: "Quick win",
    contenu: "Sans règle, les données partent dans les assistants IA grand public aux conditions de l'éditeur — localisation, conservation, réutilisation inconnues des utilisateurs. Interdire ne fonctionne pas ; encadrer fonctionne : une page suffit — outils autorisés et leur configuration, données interdites en saisie, référent désigné. Coût quasi nul, effet immédiat.",
    refs: "CNIL, recommandations IA (cnil.fr/fr/intelligence-artificielle) ; RGPD art. 5 et 32",
    domaines: ["IA souveraine / assistants", "Sensibilisation & formation"],
  },
  "PREC-A7-02": {
    titre: "Auditer les fonctions IA embarquées dans vos SaaS",
    horizon: "Quick win",
    contenu: "Les éditeurs activent des fonctions IA dans des outils déjà déployés, parfois par défaut. Trois questions par fonction : où le traitement est-il opéré, les données servent-elles à l'entraînement, l'option d'exclusion est-elle activée ? Inventoriez les 5 outils les plus utilisés, vérifiez dans la documentation contractuelle — pas la page marketing — et désactivez ce qui n'a pas d'usage justifié.",
    refs: "RGPD art. 13-14 et 28 ; CNIL, recommandations IA (cnil.fr)",
    domaines: ["IA souveraine / assistants", "GRC / conformité"],
  },
  "PREC-A8-01": {
    titre: "Donner un portage de direction à la souveraineté numérique",
    horizon: "6-12 mois",
    contenu: "Sans sponsor à la direction, le sujet est arbitré projet par projet — et perd face au coût et à l'habitude. NIS2 consacre d'ailleurs la responsabilité des organes de direction (art. 20). Portage minimal viable : un sponsor nommé, une position écrite d'une page, une revue annuelle des dépendances critiques en instance de direction, un budget identifié.",
    refs: "Directive (UE) 2022/2555, art. 20 ; doctrine « cloud au centre » (circ. n°6404-SG)",
    domaines: ["Conseil & accompagnement", "GRC"],
  },
  "PREC-A8-02": {
    titre: "Intégrer une grille souveraineté dans les achats numériques",
    horizon: "Quick win",
    contenu: "La dépendance se crée au moment de l'achat — c'est là qu'elle coûte le moins cher à éviter. Cinq critères joints à chaque consultation : localisation contractuelle (sauvegardes et support inclus), juridiction et actionnariat, qualifications vérifiées sur les listes officielles, conditions de réversibilité, clauses d'évolution unilatérale.",
    refs: "Code de la commande publique (legifrance.gouv.fr) ; UGAP ; SILL (code.gouv.fr)",
    domaines: ["Achats", "GRC / conformité"],
  },
};
const precDe = (q) => PREC[`PREC-${q.axe}-0${q.id.endsWith("G1") ? 1 : 2}`];

const HORIZON_STYLE = {
  "Quick win": { bg: "#EAF2EC", fg: "#2F6B4F", label: "QUICK WIN" },
  "6-12 mois": { bg: "#F7EFE1", fg: "#B07C2E", label: "6-12 MOIS" },
  "Structurant": { bg: "#E9EDF7", fg: "#24439B", label: "STRUCTURANT" },
};
const HorizonBadge = ({ h }) => {
  const s = HORIZON_STYLE[h] || HORIZON_STYLE["6-12 mois"];
  return (
    <span style={{
      display: "inline-block", padding: "3px 9px", borderRadius: 2,
      background: s.bg, color: s.fg, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2,
    }}>
      {s.label}
    </span>
  );
};

const NIVEAUX = [
  { label: "Critique", min: 0, color: C.garance },
  { label: "Fragile", min: 20, color: C.ocre },
  { label: "Maîtrisé", min: 45, color: C.acier },
  { label: "Avancé", min: 70, color: C.bronze },
  { label: "Exemplaire", min: 90, color: C.outremer },
];
const niveau = (score) => [...NIVEAUX].reverse().find((n) => score >= n.min);

/* ============================ SCORING ============================ */

function computeScores(answers, profil) {
  const parAxe = {};
  Object.keys(AXES).forEach((a) => (parAxe[a] = { num: 0, den: 0 }));
  QUESTIONS.forEach((q) => {
    const s = answers[q.id];
    if (s === undefined) return;
    parAxe[q.axe].num += s * q.p;
    parAxe[q.axe].den += 4 * q.p;
  });
  const axes = {};
  Object.keys(AXES).forEach((a) => {
    axes[a] = parAxe[a].den ? Math.round((parAxe[a].num / parAxe[a].den) * 100) : 0;
  });

  const assuj = ["hds", "dora", "nis2", "ose_oiv", "fournisseur_oiv"].some((v) =>
    (profil["P-02"] || []).includes(v)
  );
  const collectivite = profil["P-01"] === "collectivite";
  const w = {};
  Object.keys(AXES).forEach((a) => (w[a] = 1));
  if (assuj) w.A4 = 1.5;
  if (collectivite) w.A8 = 1.25;

  const global = Math.round(
    Object.keys(AXES).reduce((s, a) => s + axes[a] * w[a], 0) /
      Object.keys(AXES).reduce((s, a) => s + w[a], 0)
  );

  // Alerte critique : candidate pondération 3 (ou marquée) la moins bien scorée
  const tie = ["A2", "A4", "A1", "A7"];
  const candidates = QUESTIONS.filter((q) => q.candidate)
    .map((q) => ({ q, s: answers[q.id] ?? 0 }))
    .sort((x, y) => x.s - y.s || tie.indexOf(x.q.axe) - tie.indexOf(y.q.axe));
  const alerte = candidates[0]?.q;

  // Autres alertes (verrouillées) : réponses faibles hors alerte principale
  const verrouillees = QUESTIONS.filter(
    (q) => q.id !== alerte?.id && (answers[q.id] ?? 0) <= 1
  );

  return { axes, global, alerte, verrouillees, assuj };
}

/* ============================ RADAR SVG ============================ */

function Radar({ axes, size = 300 }) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 42;
  const keys = Object.keys(AXES);
  const pt = (i, r) => {
    const a = (Math.PI * 2 * i) / 8 - Math.PI / 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const poly = keys
    .map((k, i) => pt(i, (Math.max(axes[k], 4) / 100) * R).join(","))
    .join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} role="img"
      aria-label="Radar des 8 axes de souveraineté">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f}
          points={keys.map((_, i) => pt(i, R * f).join(",")).join(" ")}
          fill="none" stroke={C.ligne} strokeWidth="1" />
      ))}
      {keys.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={C.ligne} strokeWidth="1" />;
      })}
      <polygon points={poly} fill={C.outremer} fillOpacity="0.14"
        stroke={C.outremer} strokeWidth="2" strokeLinejoin="round" />
      {keys.map((k, i) => {
        const [x, y] = pt(i, (Math.max(axes[k], 4) / 100) * R);
        return <circle key={k} cx={x} cy={y} r="3.5" fill={C.encre} />;
      })}
      {keys.map((k, i) => {
        const [x, y] = pt(i, R + 22);
        return (
          <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize="11" fill={C.acier} className="ss-sans">
            {k}
          </text>
        );
      })}
    </svg>
  );
}

/* Timbre de score — la « rosette » gravée, signature de la restitution */
function Timbre({ score }) {
  const n = niveau(score);
  return (
    <svg viewBox="0 0 180 180" width="170" role="img" aria-label={`Score ${score} sur 100, niveau ${n.label}`}>
      <circle cx="90" cy="90" r="86" fill="none" stroke={C.encre} strokeWidth="1.5" />
      <circle cx="90" cy="90" r="80" fill="none" stroke={C.encre} strokeWidth="0.75" strokeDasharray="2 3" />
      <circle cx="90" cy="90" r="62" fill="none" stroke={n.color} strokeWidth="6"
        strokeDasharray={`${(score / 100) * 2 * Math.PI * 62} ${2 * Math.PI * 62}`}
        transform="rotate(-90 90 90)" strokeLinecap="butt" />
      <text x="90" y="88" textAnchor="middle" fontSize="44" fontWeight="600"
        fill={C.encre} className="ss-serif ss-tnum">{score}</text>
      <text x="90" y="108" textAnchor="middle" fontSize="11" fill={C.acier} className="ss-sans"
        letterSpacing="2">/ 100</text>
      <text x="90" y="132" textAnchor="middle" fontSize="12" fontWeight="600"
        fill={n.color} className="ss-sans" letterSpacing="1.5">{n.label.toUpperCase()}</text>
    </svg>
  );
}

/* ============================ UI ============================ */

const btnBase = {
  display: "block", width: "100%", textAlign: "left", cursor: "pointer",
  padding: "14px 18px", marginBottom: 10, borderRadius: 2,
  background: "#FFFFFF", border: `1px solid ${C.ligne}`,
  fontSize: 15, lineHeight: 1.45, color: C.encre,
};

/* ---------- Composants hoistés au niveau module ----------
   IMPORTANT : ne jamais définir de composant à l'intérieur du composant
   principal — chaque re-render (donc chaque frappe) le recréerait, React
   démonterait/remonterait les inputs et le focus serait perdu. ---------- */

/* Écran commun : cadre papier */
const Shell = ({ children, dark }) => (
  <div className="ss-sans ss-anim" style={{
    minHeight: "100vh", background: dark ? C.encre : C.papier, color: dark ? C.papier : C.encre,
    transition: "background .3s",
  }}>
    <style>{FONT}</style>
    <header style={{
      display: "flex", alignItems: "center", gap: 14, padding: "18px 24px",
      borderBottom: `1px solid ${dark ? C.encre2 : C.ligne}`,
    }}>
      <Lisere vertical size={26} />
      <span className="ss-serif" style={{ fontSize: 19, fontWeight: 600, letterSpacing: 0.5, color: C.orange }}>
        SouverainScore
      </span>
      <span style={{ fontSize: 11, color: dark ? "#8B95A8" : C.acier, letterSpacing: 2, marginLeft: "auto" }}>
        DIAGNOSTIC · GRATUIT · 8 MIN
      </span>
    </header>
    {children}
    <footer style={{
      padding: "22px 24px", fontSize: 11.5, lineHeight: 1.6,
      color: dark ? "#8B95A8" : C.acier, borderTop: `1px solid ${dark ? C.encre2 : C.ligne}`,
      maxWidth: 880, margin: "40px auto 0",
    }}>
      Ce diagnostic est un état des lieux déclaratif accompagné de préconisations générales.
      Il ne constitue ni une certification, ni un avis juridique. Méthodologie : 8 axes alignés
      sur le Cloud Sovereignty Framework européen, références SecNumCloud (ANSSI), NIS2, DORA,
      doctrine « cloud au centre ». Prototype v0.1.
    </footer>
  </div>
);

/* Champ du formulaire de fin de parcours */
const champStyle = {
  width: "100%", padding: "12px 14px", fontSize: 14.5, borderRadius: 2,
  border: `1px solid ${C.ligne}`, background: "#FFF", boxSizing: "border-box",
  color: C.encre,
};
const labelStyle = {
  display: "block", fontSize: 12, letterSpacing: 0.8, fontWeight: 600,
  color: C.acier, marginBottom: 5,
};
const Field = ({ id, l, value, onChange, type = "text", placeholder, optional, half }) => (
  <div style={{ flex: half ? "1 1 200px" : "1 1 100%", marginBottom: 14 }}>
    <label htmlFor={id} style={labelStyle}>
      {l.toUpperCase()}{optional && <span style={{ fontWeight: 400 }}> — facultatif</span>}
    </label>
    <input id={id} type={type} value={value} onChange={onChange}
      placeholder={placeholder} style={champStyle} />
  </div>
);

export default function DiagnosticSouverainScore() {
  const [screen, setScreen] = useState("landing"); // landing | quiz | email | result
  const [step, setStep] = useState(0); // 0..18 (3 profilage + 16 questions)
  const [profil, setProfil] = useState({});
  const [answers, setAnswers] = useState({});
  const [form, setForm] = useState({
    organisation: "", prenom: "", nom: "", fonction: "",
    email: "", tel: "", commune: "",
    communaute: false, newsletter: false,
  });
  const setF = (k) => (e) => {
    setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
    if (k === "email") setPersoConfirme(false); // toute modification de l'email invalide la confirmation
  };

  // Domaines de messagerie personnelle — déclenchent un avertissement franchissable
  // (pas un blocage : certaines petites structures utilisent une adresse orange/wanadoo
  // comme adresse officielle). Le franchissement est tracé pour la qualification du lead.
  const DOMAINES_PERSO = [
    "gmail.com", "googlemail.com", "yahoo.com", "yahoo.fr", "hotmail.com", "hotmail.fr",
    "outlook.com", "outlook.fr", "live.com", "live.fr", "msn.com", "icloud.com", "me.com",
    "aol.com", "free.fr", "sfr.fr", "neuf.fr", "laposte.net", "bbox.fr", "gmx.com", "gmx.fr",
    "protonmail.com", "proton.me", "mail.com", "orange.fr", "wanadoo.fr",
  ];
  const [persoConfirme, setPersoConfirme] = useState(false); // « continuer quand même » coché
  const emailFormatOk = /.+@.+\..+/.test(form.email);
  const emailPerso =
    emailFormatOk &&
    DOMAINES_PERSO.includes(form.email.split("@")[1]?.trim().toLowerCase());
  // Champs requis remplis ; si l'email semble personnel, la confirmation est exigée en plus.
  const formValide =
    form.organisation.trim() && form.fonction.trim() && emailFormatOk &&
    (!emailPerso || persoConfirme);
  // À la soumission (v0.1 Supabase) : enregistrer { ...form, email_perso_confirme: emailPerso && persoConfirme }
  // → flag de qualification du lead, exploitable pour prioriser les relances.
  const [multiSel, setMultiSel] = useState([]);

  const total = PROFILAGE.length + QUESTIONS.length;
  const isProfilage = step < PROFILAGE.length;
  const current = isProfilage ? PROFILAGE[step] : QUESTIONS[step - PROFILAGE.length];

  const res = useMemo(() => computeScores(answers, profil), [answers, profil]);

  /* Envoi du diagnostic vers Supabase.
     L'affichage des résultats n'attend pas l'enregistrement : on montre
     d'abord, on enregistre en arrière-plan. Si Supabase n'est pas configuré
     (variables d'env absentes) ou si l'insertion échoue, l'utilisateur voit
     quand même ses résultats — la donnée est perdue, pas l'expérience. */
  const envoyerDiagnostic = () => {
    setScreen("result");
    if (!supabase) return; // mode prototype
    supabase
      .from("diagnostics")
      .insert({
        organisation: form.organisation.trim(),
        fonction: form.fonction.trim(),
        email: form.email.trim().toLowerCase(),
        email_perso_confirme: emailPerso && persoConfirme,
        optin_communaute: form.communaute,
        optin_newsletter: form.newsletter,
        profil,
        reponses: answers,
        score_global: res.global,
        scores_axes: res.axes,
        alerte_id: res.alerte ? `PREC-${res.alerte.axe}-0${res.alerte.id.endsWith("G1") ? 1 : 2}` : null,
      })
      .then(({ error }) => {
        if (error) console.error("Enregistrement diagnostic échoué :", error.message);
      });
  };

  const next = () => {
    if (step + 1 >= total) setScreen("email");
    else setStep(step + 1);
    setMultiSel([]);
  };
  const back = () => {
    if (step === 0) setScreen("landing");
    else setStep(step - 1);
    setMultiSel([]);
  };

  /* ============================ LANDING ============================ */
  if (screen === "landing") {
    return (
      <Shell>
        <main style={{ maxWidth: 880, margin: "0 auto", padding: "56px 24px 0" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 48, alignItems: "center" }}>
            <div style={{ flex: "1 1 380px" }}>
              <div style={{ marginBottom: 22 }}>
                <div style={{ width: 44, height: 4, background: C.orange, marginBottom: 12 }} />
                <div className="ss-sans" style={{
                  fontSize: 22, letterSpacing: 3.5, color: C.encre, fontWeight: 700,
                  textTransform: "uppercase", lineHeight: 1.25,
                }}>
                  Souveraineté numérique
                </div>
              </div>
              <h1 className="ss-serif" style={{ fontSize: 40, lineHeight: 1.14, fontWeight: 600, margin: "0 0 14px" }}>
                Un matin, votre fournisseur change les règles.
              </h1>
              <p className="ss-serif" style={{
                fontSize: 20, lineHeight: 1.45, fontStyle: "italic",
                color: C.encre, margin: "0 0 18px", maxWidth: 480,
              }}>
                Prix, contrat, accès, juridiction — ce jour-là, que vous restera-t-il ?
              </p>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: C.acier, margin: "0 0 28px", maxWidth: 470 }}>
                Vous assurez vos locaux contre l'incendie. Votre dépendance numérique,
                elle, n'est probablement jamais mesurée. En 16 questions, situez votre
                exposition sur 8 axes — hébergement, juridiction, réversibilité,
                conformité — et découvrez l'alerte que vous ne voyez pas encore.
              </p>
              <button
                onClick={() => { setScreen("quiz"); setStep(0); }}
                style={{
                  background: C.encre, color: C.papier, border: "none", cursor: "pointer",
                  padding: "15px 30px", fontSize: 15, fontWeight: 600, letterSpacing: 0.5, borderRadius: 2,
                }}>
                Mesurer mon exposition →
              </button>
              <div style={{ display: "flex", gap: 26, marginTop: 30, fontSize: 13, color: C.acier }}>
                <span>✓ Sans compte</span>
                <span>✓ 8 minutes</span>
                <span>✓ Références officielles</span>
              </div>
            </div>
            <div style={{ flex: "0 1 320px", opacity: 0.92 }}>
              <Radar axes={{ A1: 62, A2: 28, A3: 45, A4: 55, A5: 38, A6: 70, A7: 22, A8: 48 }} />
              <div style={{ textAlign: "center", fontSize: 11.5, color: C.acier, marginTop: 4 }}>
                Exemple de restitution — radar 8 axes
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 64, paddingTop: 28, borderTop: `1px solid ${C.ligne}`,
            fontSize: 14, lineHeight: 1.55, color: C.acier, textAlign: "center",
          }}>
            <strong style={{ color: C.encre }}>Diagnostic gratuit.</strong> Score sur 100,
            radar 8 axes, votre alerte n°1 détaillée — références officielles à l'appui.
          </div>
        </main>
      </Shell>
    );
  }

  /* ============================ QUIZ ============================ */
  if (screen === "quiz") {
    const progress = ((step + 1) / total) * 100;
    return (
      <Shell>
        <main style={{ maxWidth: 660, margin: "0 auto", padding: "36px 24px 0" }}>
          {/* progression */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.acier, marginBottom: 8 }}>
            <span style={{ letterSpacing: 1.5, fontWeight: 600, color: isProfilage ? C.acier : C.outremer }}>
              {isProfilage ? "VOTRE PROFIL" : `${current.axe} — ${AXES[current.axe].toUpperCase()}`}
            </span>
            <span className="ss-tnum">{step + 1} / {total}</span>
          </div>
          <div style={{ height: 3, background: C.papier2, marginBottom: 34 }}>
            <div className="ss-anim" style={{ height: 3, width: `${progress}%`, background: C.outremer, transition: "width .25s" }} />
          </div>

          <h2 className="ss-serif" style={{ fontSize: 24, lineHeight: 1.35, fontWeight: 600, margin: "0 0 6px" }}>
            {current.texte}
          </h2>
          {current.note && <p style={{ fontSize: 13, color: C.acier, margin: "0 0 4px" }}>{current.note}</p>}
          <div style={{ height: 20 }} />

          {isProfilage && current.multiple ? (
            <>
              {current.opts.map((o) => {
                const on = multiSel.includes(o.v);
                return (
                  <button key={o.v}
                    onClick={() =>
                      setMultiSel(on ? multiSel.filter((x) => x !== o.v) : [...multiSel, o.v])
                    }
                    style={{
                      ...btnBase,
                      borderLeft: on ? `3px solid ${C.outremer}` : `3px solid transparent`,
                      background: on ? "#FFFFFF" : "#FCFBF7",
                      borderColor: on ? C.outremer : C.ligne,
                    }}>
                    {o.l}
                  </button>
                );
              })}
              <button
                disabled={multiSel.length === 0}
                onClick={() => { setProfil({ ...profil, [current.id]: multiSel }); next(); }}
                style={{
                  marginTop: 8, background: multiSel.length ? C.encre : C.ligne,
                  color: C.papier, border: "none", cursor: multiSel.length ? "pointer" : "default",
                  padding: "13px 26px", fontSize: 14, fontWeight: 600, borderRadius: 2,
                }}>
                Continuer
              </button>
            </>
          ) : (
            current.opts.map((o) => (
              <button key={o.l}
                onClick={() => {
                  if (isProfilage) setProfil({ ...profil, [current.id]: o.v });
                  else setAnswers({ ...answers, [current.id]: o.s });
                  next();
                }}
                style={btnBase}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = C.outremer; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = C.ligne; }}>
                {o.l}
              </button>
            ))
          )}

          {current.ref && (
            <div style={{
              marginTop: 22, paddingTop: 14, borderTop: `1px solid ${C.ligne}`,
              fontSize: 12, color: C.acier, lineHeight: 1.5,
            }}>
              <span style={{ letterSpacing: 1.5, fontWeight: 600 }}>RÉFÉRENCE — </span>{current.ref}
            </div>
          )}

          <button onClick={back} style={{
            marginTop: 24, background: "none", border: "none", cursor: "pointer",
            fontSize: 13, color: C.acier, padding: 0,
          }}>
            ← Précédent
          </button>
        </main>
      </Shell>
    );
  }

  /* ============================ FORMULAIRE ============================ */
  if (screen === "email") {
    return (
      <Shell>
        <main style={{ maxWidth: 520, margin: "0 auto", padding: "56px 24px 0" }}>
          <div style={{ textAlign: "center" }}>
            <Lisere size={64} />
            <h2 className="ss-serif" style={{ fontSize: 28, fontWeight: 600, margin: "24px 0 8px" }}>
              Votre diagnostic est prêt.
            </h2>
            <p style={{ fontSize: 14.5, color: C.acier, lineHeight: 1.6, marginBottom: 28 }}>
              Trois informations suffisent pour afficher vos résultats et recevoir
              la synthèse. Le reste (identité, coordonnées, facturation) ne vous sera
              demandé qu'au passage à l'audit complet.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 14px" }}>
            <Field id="organisation" l="Organisme / entreprise" placeholder="Mairie de… / SARL…"
              value={form.organisation} onChange={setF("organisation")} />
            <Field id="fonction" l="Fonction" placeholder="DSI, DGS, RSSI, dirigeant…"
              value={form.fonction} onChange={setF("fonction")} />
            <Field id="email" l="Email professionnel" type="email" placeholder="prenom.nom@organisation.fr"
              value={form.email} onChange={setF("email")} />
          </div>
          {emailPerso && (
            <div style={{
              padding: "12px 14px", marginTop: -6, marginBottom: 12,
              background: "#FCF6ED", border: `1px solid ${C.ocre}`, borderRadius: 2,
              fontSize: 13, lineHeight: 1.55, color: C.encre,
            }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                <span aria-hidden="true" style={{ color: C.ocre }}>⚠</span>
                <span>
                  Cette adresse semble être une messagerie personnelle. Le diagnostic étant
                  destiné aux organisations, l'adresse de votre organisme ou entreprise est
                  préférable — la synthèse y sera envoyée.
                </span>
              </div>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontWeight: 600 }}>
                <input type="checkbox" checked={persoConfirme}
                  onChange={(e) => setPersoConfirme(e.target.checked)}
                  style={{ marginTop: 2, accentColor: C.ocre }} />
                <span>C'est bien l'adresse que mon organisation utilise — continuer quand même.</span>
              </label>
            </div>
          )}

          {/* Opt-ins — cases décochées par défaut (consentement libre et spécifique) */}
          <div style={{
            marginTop: 6, padding: "16px 18px", background: "#FFFFFF",
            border: `1px solid ${C.ligne}`, borderRadius: 2,
          }}>
            <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", fontSize: 13.5, lineHeight: 1.55, color: C.encre }}>
              <input type="checkbox" checked={form.communaute} onChange={setF("communaute")}
                style={{ marginTop: 3, accentColor: C.outremer }} />
              <span>
                <strong>Rejoindre la communauté SouverainScore</strong> — échanges entre pairs
                (DSI, DGS, RSSI) sur les retours d'expérience de migration et les questions
                de souveraineté.
              </span>
            </label>
            <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", fontSize: 13.5, lineHeight: 1.55, color: C.encre, marginTop: 12 }}>
              <input type="checkbox" checked={form.newsletter} onChange={setF("newsletter")}
                style={{ marginTop: 3, accentColor: C.outremer }} />
              <span>
                <strong>Recevoir la newsletter</strong> — l'actualité de la souveraineté numérique
                (réglementation, qualifications ANSSI, doctrine cloud, solutions) environ une fois
                par mois. Désinscription à tout moment.
              </span>
            </label>
          </div>

          <button
            disabled={!formValide}
            onClick={envoyerDiagnostic}
            style={{
              marginTop: 16, width: "100%", padding: "15px", fontSize: 15, fontWeight: 600,
              background: formValide ? C.encre : C.ligne, color: C.papier,
              border: "none", borderRadius: 2, cursor: formValide ? "pointer" : "default",
            }}>
            Voir mes résultats
          </button>
          <p style={{ fontSize: 11.5, color: C.acier, marginTop: 14, lineHeight: 1.55 }}>
            Vos données servent à vous adresser cette synthèse et, si vous l'avez demandé,
            la newsletter et les informations de la communauté. Les informations complémentaires
            (identité, coordonnées, facturation) ne sont collectées qu'à la souscription d'une
            formule payante. Conservation limitée, droits d'accès et de suppression sur simple
            demande. (Mentions RGPD complètes à valider par juriste — prototype.)
          </p>
        </main>
      </Shell>
    );
  }

  /* ============================ RÉSULTAT ============================ */
  const nv = niveau(res.global);
  return (
    <Shell>
      <main style={{ maxWidth: 880, margin: "0 auto", padding: "44px 24px 0" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 44, alignItems: "center" }}>
          <div style={{ flex: "0 0 auto", textAlign: "center" }}>
            <Timbre score={res.global} />
          </div>
          <div style={{ flex: "1 1 300px" }}>
            <div style={{ fontSize: 12, letterSpacing: 2.5, color: C.acier, fontWeight: 600, marginBottom: 10 }}>
              VOTRE NIVEAU DE SOUVERAINETÉ
            </div>
            <h2 className="ss-serif" style={{ fontSize: 32, fontWeight: 600, margin: "0 0 12px", color: nv.color }}>
              {nv.label}
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: C.acier, maxWidth: 460 }}>
              Score pondéré selon votre profil{res.assuj ? " (axe Sécurité & conformité sur-pondéré : votre organisation relève d'un cadre réglementé)" : ""}.
              Échelle alignée sur les cinq niveaux d'assurance du Cloud Sovereignty Framework européen.
            </p>
          </div>
          <div style={{ flex: "0 1 300px" }}>
            <Radar axes={res.axes} size={280} />
          </div>
        </div>

        {/* Alerte critique — constat + fiche préconisation issue du bloc PREC */}
        {res.alerte && (() => {
          const bloc = precDe(res.alerte);
          return (
            <section style={{
              marginTop: 48, background: "#FFFFFF", border: `1px solid ${C.ligne}`,
              display: "flex", borderRadius: 2, overflow: "hidden",
            }}>
              <div style={{ width: 5, background: C.garance, flexShrink: 0 }} />
              <div style={{ padding: "26px 28px", width: "100%" }}>
                <div style={{ fontSize: 11.5, letterSpacing: 2, color: C.garance, fontWeight: 700, marginBottom: 8 }}>
                  ALERTE N°1 — {res.alerte.axe} · {AXES[res.alerte.axe].toUpperCase()}
                </div>
                <h3 className="ss-serif" style={{ fontSize: 22, fontWeight: 600, margin: "0 0 12px" }}>
                  {res.alerte.alerte.titre}
                </h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.65, color: C.encre, margin: "0 0 18px" }}>
                  {res.alerte.alerte.corps}
                </p>

                {/* Fiche préconisation */}
                <div style={{
                  background: C.papier, border: `1px solid ${C.ligne}`, borderRadius: 2,
                  padding: "18px 20px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, letterSpacing: 1.8, color: C.acier, fontWeight: 700 }}>
                      NOTRE PRÉCONISATION
                    </span>
                    <HorizonBadge h={bloc.horizon} />
                  </div>
                  <div className="ss-serif" style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
                    {bloc.titre}
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: C.encre, margin: "0 0 12px" }}>
                    {bloc.contenu}
                  </p>
                  <div style={{ fontSize: 12, color: C.acier, marginBottom: 12 }}>
                    <span style={{ letterSpacing: 1.5, fontWeight: 600 }}>RÉFÉRENCES — </span>{bloc.refs}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 11, letterSpacing: 1.5, color: C.acier, fontWeight: 600 }}>
                      SOLUTIONS À EXPLORER :
                    </span>
                    {bloc.domaines.map((d) => (
                      <span key={d} style={{
                        fontSize: 12, padding: "4px 10px", borderRadius: 2,
                        background: "#FFFFFF", border: `1px solid ${C.ligne}`, color: C.encre,
                      }}>
                        {d}
                      </span>
                    ))}
                    <span style={{ fontSize: 11.5, color: C.acier }}>
                      → shortlist personnalisée dans l'audit complet
                    </span>
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* Alertes verrouillées — horizon visible, titre masqué */}
        {res.verrouillees.length > 0 && (() => {
          const quickWins = res.verrouillees.filter((q) => precDe(q)?.horizon === "Quick win").length;
          return (
            <section style={{ marginTop: 26 }}>
              <div style={{ fontSize: 12, letterSpacing: 2, color: C.acier, fontWeight: 600, marginBottom: 12 }}>
                {res.verrouillees.length} AUTRE{res.verrouillees.length > 1 ? "S" : ""} POINT{res.verrouillees.length > 1 ? "S" : ""} DE VIGILANCE
                {quickWins > 0 && (
                  <span style={{ color: HORIZON_STYLE["Quick win"].fg }}>
                    {" "}— DONT {quickWins} CORRIGEABLE{quickWins > 1 ? "S" : ""} RAPIDEMENT
                  </span>
                )}
              </div>
              {res.verrouillees.slice(0, 5).map((q) => {
                const bloc = precDe(q);
                return (
                  <div key={q.id} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "13px 18px",
                    background: C.papier2, border: `1px solid ${C.ligne}`, borderRadius: 2, marginBottom: 8,
                    color: C.acier, fontSize: 14,
                  }}>
                    <span aria-hidden="true">🔒</span>
                    <span style={{ flex: 1 }}>
                      {q.axe} · {AXES[q.axe]} — <span style={{ filter: "blur(4px)", userSelect: "none" }}>{bloc?.titre || "préconisation détaillée"}</span>
                    </span>
                    {bloc && <HorizonBadge h={bloc.horizon} />}
                  </div>
                );
              })}
            </section>
          );
        })()}

        {/* CTA — les deux formules payantes au choix */}
        <section style={{ marginTop: 44 }}>
          <h3 className="ss-serif" style={{ fontSize: 24, fontWeight: 600, margin: "0 0 6px", textAlign: "center" }}>
            Passez du déclaratif au vérifié.
          </h3>
          <p style={{ fontSize: 14, color: C.acier, textAlign: "center", margin: "0 0 26px", lineHeight: 1.6 }}>
            Deux formules, un même audit : 55-70 questions adaptées à votre profil, multi-répondants,
            preuves documentaires, rapport de 25-35 pages, shortlist de solutions souveraines.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "stretch" }}>

            {/* Formule 1 — Audit self-service */}
            <div style={{
              flex: "1 1 320px", background: "#FFFFFF", border: `1px solid ${C.ligne}`,
              borderRadius: 2, display: "flex", flexDirection: "column", overflow: "hidden",
            }}>
              <div style={{ height: 4, background: C.outremer }} />
              <div style={{ padding: "26px 26px 24px", display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ fontSize: 11.5, letterSpacing: 2, color: C.outremer, fontWeight: 700, marginBottom: 8 }}>
                  AUDIT SELF-SERVICE
                </div>
                <div className="ss-serif ss-tnum" style={{ fontSize: 34, fontWeight: 600, marginBottom: 14 }}>
                  490 € <span style={{ fontSize: 15, color: C.acier }}>HT</span>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 14, lineHeight: 1.55, color: C.encre, flex: 1 }}>
                  {[
                    "Questionnaire adaptatif : 55-70 questions selon votre profil",
                    "Multi-répondants : chaque axe assigné au bon interlocuteur (DSI, juridique, achats, métier)",
                    "Questions à preuves : contrats, attestations d'hébergement, certificats",
                    "Rapport de 25-35 pages : constats, écarts réglementaires sourcés, préconisations priorisées",
                    "Shortlist personnalisée de solutions souveraines (annuaire)",
                  ].map((t) => (
                    <li key={t} style={{ display: "flex", gap: 10, marginBottom: 9 }}>
                      <span style={{ color: C.outremer, flexShrink: 0 }}>—</span><span>{t}</span>
                    </li>
                  ))}
                </ul>
                <button style={{
                  marginTop: 20, background: C.encre, color: C.papier, border: "none",
                  padding: "14px", fontSize: 14.5, fontWeight: 700, borderRadius: 2, cursor: "pointer", width: "100%",
                }}>
                  Lancer l'audit →
                </button>
                <div style={{ fontSize: 11.5, color: C.acier, textAlign: "center", marginTop: 10 }}>
                  100 % en ligne · à votre rythme · sauvegarde de progression
                </div>
              </div>
            </div>

            {/* Formule 2 — Audit + restitution */}
            <div style={{
              flex: "1 1 320px", background: C.encre, color: C.papier, border: `1px solid ${C.encre}`,
              borderRadius: 2, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative",
            }}>
              <div style={{ height: 4, background: C.garance }} />
              <div style={{ padding: "26px 26px 24px", display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <span style={{ fontSize: 11.5, letterSpacing: 2, color: "#E4A0AE", fontWeight: 700 }}>
                    AUDIT + RESTITUTION
                  </span>
                  <span style={{
                    fontSize: 10.5, letterSpacing: 1, color: C.papier, border: `1px solid #3A4A6E`,
                    padding: "3px 8px", borderRadius: 2,
                  }}>
                    PLACES LIMITÉES / MOIS
                  </span>
                </div>
                <div className="ss-serif ss-tnum" style={{ fontSize: 34, fontWeight: 600, marginBottom: 14 }}>
                  1 290 € <span style={{ fontSize: 15, color: "#8B95A8" }}>HT</span>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 14, lineHeight: 1.55, flex: 1 }}>
                  {[
                    "Tout l'audit self-service, à l'identique",
                    "1 h de restitution en visio avec un expert : lecture guidée de vos résultats",
                    "Feuille de route priorisée 6-12-24 mois, ajustée en séance",
                    "Réponses à vos questions sur les solutions shortlistées",
                  ].map((t) => (
                    <li key={t} style={{ display: "flex", gap: 10, marginBottom: 9 }}>
                      <span style={{ color: "#E4A0AE", flexShrink: 0 }}>—</span><span>{t}</span>
                    </li>
                  ))}
                </ul>
                <button style={{
                  marginTop: 20, background: C.papier, color: C.encre, border: "none",
                  padding: "14px", fontSize: 14.5, fontWeight: 700, borderRadius: 2, cursor: "pointer", width: "100%",
                }}>
                  Réserver audit + restitution →
                </button>
                <div style={{ fontSize: 11.5, color: "#8B95A8", textAlign: "center", marginTop: 10 }}>
                  Créneaux ouverts chaque mois en volume limité
                </div>
              </div>
            </div>
          </div>

          <p style={{ fontSize: 12, color: C.acier, textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>
            À titre de comparaison : une mission de conseil en souveraineté représente un panier moyen
            de 100-150 k€ (Numeum-PAC, Observatoire S2 2025).
          </p>
        </section>

        <button onClick={() => {
          setScreen("landing"); setStep(0); setAnswers({}); setProfil({});
          setForm({ organisation: "", prenom: "", nom: "", fonction: "", email: "", tel: "", commune: "", communaute: false, newsletter: false });
          setPersoConfirme(false);
        }}
          style={{ marginTop: 28, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.acier, padding: 0 }}>
          ↻ Refaire le diagnostic
        </button>
      </main>
    </Shell>
  );
}

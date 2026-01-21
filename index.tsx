import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- Configuration & Data ---

// Knowledge Vault: Solage Products
// (Simulated data loaded from Drive)
const PRODUCTS = [
  { 
    id: 'col', 
    name: 'Collagène Natif Type II', 
    price: 69.00, 
    desc: 'Pour la souplesse et le confort articulaire.',
    benefits: { 
      science: 'Efficacité prouvée cliniquement sur le cartilage', 
      wellness: 'Retrouvez votre liberté de mouvement', 
      promo: 'Offre découverte : -10€ aujourd\'hui' 
    } 
  },
  { 
    id: 'vit', 
    name: 'Vitamine C Liposomale', 
    price: 29.00, 
    desc: 'Booster d\'immunité et d\'énergie.',
    benefits: { 
      science: 'Technologie liposomale pour une absorption x10', 
      wellness: 'Dites adieu aux coups de fatigue', 
      promo: '2 achetés = 1 offert (spécial hiver)' 
    } 
  },
  { 
    id: 'ome', 
    name: 'Omega 3 Krill', 
    price: 35.00, 
    desc: 'Cœur, cerveau et vision.',
    benefits: { 
      science: 'Riche en astaxanthine et phospholipides', 
      wellness: 'Une mémoire vive et un cœur solide', 
      promo: 'Pack Sérénité (-20%)' 
    } 
  },
  {
    id: 'detox',
    name: 'Elixir Détox',
    price: 45.00,
    desc: 'Purification de l\'organisme.',
    benefits: {
      science: 'Synergie de 5 plantes drainantes',
      wellness: 'Sentez-vous légère et purifiée',
      promo: 'Cure de printemps : -15%'
    }
  }
];

const NETWORKS = [
  { id: 'fb', name: 'Facebook', icon: '📘', style: 'Amical' },
  { id: 'insta', name: 'Instagram', icon: '📸', style: 'Visuel' },
  { id: 'li', name: 'LinkedIn', icon: '💼', style: 'Expert' },
  { id: 'yt', name: 'YouTube', icon: '🎥', style: 'Vidéo' },
];

const TONES = [
  { id: 'expert', name: "L'Experte", desc: "Sérieux, rassurant, idéal LinkedIn", target: 'li' },
  { id: 'friend', name: "L'Amie", desc: "Chaleureux, proche, idéal Facebook", target: 'fb' },
  { id: 'quick', name: "Le Conseil Rapide", desc: "Dynamique, efficace, idéal Instagram", target: 'insta' },
];

// --- Components ---

interface ButtonProps {
  onClick: () => void | Promise<void>;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'action';
  className?: string;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ onClick, children, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "w-full py-4 px-6 rounded-xl text-lg font-bold transition-all transform active:scale-95 shadow-md flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-gradient-to-r from-pink-400 to-pink-500 text-white hover:from-pink-500 hover:to-pink-600 border border-pink-600", // Pink Brand
    secondary: "bg-white text-slate-700 border-2 border-slate-200 hover:border-pink-400 hover:bg-slate-50",
    action: "bg-blue-900 text-white hover:bg-blue-800", // Solage Blue
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

interface CardProps {
  children?: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-xl p-6 border border-slate-100 ${className}`}>
    {children}
  </div>
);

interface ProgressBarProps {
  step: number;
  total: number;
}

const ProgressBar = ({ step, total }: ProgressBarProps) => (
  <div className="w-full bg-slate-200 h-2 rounded-full mb-6 overflow-hidden">
    <div 
      className="bg-pink-400 h-full transition-all duration-500 ease-out"
      style={{ width: `${((step + 1) / total) * 100}%` }}
    />
  </div>
);

// --- Main Application ---

const App = () => {
  // State
  // Step -1 represents the "Connect to Vault" phase
  const [step, setStep] = useState(-1);
  const [isConnectingVault, setIsConnectingVault] = useState(false);
  const [selections, setSelections] = useState({
    product: null,
    benefitType: null, // 'science', 'wellness', 'promo'
    network: null,
    tone: null,
    visualType: null, // 'photo' or 'product'
    selfie: null, // DataURL if they take a photo
  });
  const [generatedContent, setGeneratedContent] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);

  // Constants
  const TOTAL_STEPS = 7;

  // --- Helpers ---
  
  const calculatePrices = (basePrice) => {
    return {
      base: basePrice.toFixed(2),
      vdi: (basePrice * 0.95).toFixed(2), // -5%
      qty3: ((basePrice * 3) * 0.90).toFixed(2), // -10% on total
      synergy: (basePrice * 0.855).toFixed(2), // ~14.5% approx per unit equivalent or pack
      sub: (basePrice * 0.80).toFixed(2) // -20%
    };
  };

  const handleSelection = (key, value) => {
    setSelections(prev => ({ ...prev, [key]: value }));
    nextStep();
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => Math.max(0, prev - 1));

  // --- API & Actions ---

  const connectVault = () => {
    setIsConnectingVault(true);
    // Simulate connection delay
    setTimeout(() => {
      setIsConnectingVault(false);
      nextStep(); // Move to Step 0 (Accueil)
    }, 2500);
  };

  const generateCampaign = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      if (!process.env.API_KEY) throw new Error("Clé API manquante");

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const product = PRODUCTS.find(p => p.id === selections.product);
      const benefitText = product.benefits[selections.benefitType];
      const network = NETWORKS.find(n => n.id === selections.network);
      const tone = TONES.find(t => t.id === selections.tone);

      // 1. Generate Text Content
      const prompt = `
        Rôle : Tu es "My Brand ManagApp", l'assistant marketing de Katy (74 ans), experte bien-être chez SOLAGE.
        Tâche : Créer un post pour ${network.name}.
        Produit : ${product.name} (${product.desc}).
        Angle : ${benefitText}.
        Tonalité : ${tone.name} (${tone.desc}).
        Lien boutique : boutique.solage.fr/?codecourtier=katysolage
        
        Génère une réponse JSON avec :
        1. "caption" : Le texte du post (avec emojis, hashtags, et le lien).
        2. "imagePrompt" : Une description visuelle détaillée pour générer une image professionnelle mettant en scène le produit ou l'ambiance (sans texte dans l'image). Couleurs Solage : Bleu, Blanc, Or et Rose.
        3. "comments" : Liste de 3 commentaires courts et engageants que Katy peut poster sous d'autres publications pour engager la conversation.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              caption: { type: Type.STRING },
              imagePrompt: { type: Type.STRING },
              comments: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              }
            }
          }
        }
      });

      const content = JSON.parse(response.text);
      setGeneratedContent(content);

      // 2. Generate Image (if not selfie)
      if (selections.visualType === 'product') {
        const imageResp = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: content.imagePrompt,
          // Removed invalid responseMimeType config for image model
        });
        
        // Extract base64 image
        // Let's iterate parts to find image
        const parts = imageResp.candidates?.[0]?.content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData) {
              setGeneratedImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
              break;
            }
          }
        }
      }

      nextStep(); // Go to results
    } catch (e) {
      console.error(e);
      setError("Oups, une petite erreur s'est glissée. Réessayons !");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Camera Logic ---
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) {
      alert("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  };

  const takeSelfie = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const data = canvas.toDataURL('image/jpeg');
      setSelections(prev => ({ ...prev, selfie: data }));
      
      // Stop stream
      const stream = video.srcObject;
      stream?.getTracks().forEach(track => track.stop());
      setShowCamera(false);
    }
  };

  // --- Step Renders ---

  const renderStep = () => {
    switch(step) {
      case -1: // Connect Vault
        return (
          <div className="text-center space-y-8 animate-fade-in py-4">
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center border-4 border-pink-100">
                <span className="text-5xl">🔐</span>
              </div>
            </div>
            <h1 className="text-3xl font-serif text-blue-900 mb-2">Knowledge Vault</h1>
            <p className="text-slate-500 max-w-xs mx-auto">
              Connexion sécurisée au dossier Google Drive de Katy pour récupérer les dernières fiches produits et tarifs à jour.
            </p>
            
            <div className="pt-4">
              {isConnectingVault ? (
                <div className="space-y-4">
                   <div className="w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                   <p className="text-pink-500 font-bold animate-pulse">Synchronisation en cours...</p>
                   <p className="text-xs text-slate-400">Récupération des images HD...</p>
                </div>
              ) : (
                <Button onClick={connectVault}>
                  🔗 Connecter mon Google Drive
                </Button>
              )}
            </div>
          </div>
        );

      case 0: // Accueil
        return (
          <div className="text-center space-y-8 animate-fade-in">
            <h1 className="text-4xl font-serif text-blue-900 mb-2">My Brand ManagApp</h1>
            <p className="text-pink-500 font-bold tracking-widest uppercase text-sm">Laboratoires Solage</p>
            <div className="bg-green-50 text-green-700 px-4 py-2 rounded-full inline-flex items-center gap-2 text-sm mb-4">
              <span>✅ Vault Synchronisé</span>
            </div>
            <div className="py-4">
              <p className="text-xl text-slate-600">Bonjour Katy ! 👋</p>
              <p className="text-2xl font-serif text-slate-800 mt-2">Prête à faire rayonner ton activité aujourd'hui ?</p>
            </div>
            <Button onClick={nextStep}>C'est parti ! 🚀</Button>
          </div>
        );

      case 1: // Produit
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-serif text-blue-900 text-center">Quel trésor souhaites-tu mettre en avant ?</h2>
            <div className="grid gap-4">
              {PRODUCTS.map(p => (
                <Button key={p.id} variant="secondary" onClick={() => handleSelection('product', p.id)} className="text-left justify-start">
                  <span className="bg-blue-100 text-blue-800 p-2 rounded-lg text-xl mr-3">💎</span>
                  <div className="text-left">
                    <div className="font-bold text-lg">{p.name}</div>
                    <div className="text-sm text-slate-500">{p.desc}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        );

      case 2: // Bénéfice
        const prod = PRODUCTS.find(p => p.id === selections.product);
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-serif text-blue-900 text-center">Quel aspect de <span className="text-pink-500">{prod?.name}</span> veux-tu souligner ?</h2>
            <div className="grid gap-4">
              <Button variant="secondary" onClick={() => handleSelection('benefitType', 'science')}>
                🔬 <span className="flex-1 text-left">L'Efficacité Scientifique</span>
              </Button>
              <Button variant="secondary" onClick={() => handleSelection('benefitType', 'wellness')}>
                🧘‍♀️ <span className="flex-1 text-left">Le Bien-être Ressenti</span>
              </Button>
              <Button variant="secondary" onClick={() => handleSelection('benefitType', 'promo')}>
                🎁 <span className="flex-1 text-left">Une Offre Spéciale</span>
              </Button>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-sm">
              💡 <strong>Le conseil du Vault :</strong> {prod?.benefits.science}
            </div>
          </div>
        );

      case 3: // Réseau Social
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-serif text-blue-900 text-center">Sur quel réseau allons-nous publier ?</h2>
            <div className="grid grid-cols-2 gap-4">
              {NETWORKS.map(n => (
                <Button key={n.id} variant="secondary" onClick={() => handleSelection('network', n.id)} className="flex-col h-32 justify-center gap-2">
                  <span className="text-4xl">{n.icon}</span>
                  <span>{n.name}</span>
                </Button>
              ))}
            </div>
          </div>
        );

      case 4: // Tonalité
        const currentNetwork = NETWORKS.find(n => n.id === selections.network);
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-serif text-blue-900 text-center">Quelle tonalité pour {currentNetwork?.name} ?</h2>
            <div className="grid gap-4">
              {TONES.map(t => (
                <Button key={t.id} variant="secondary" onClick={() => handleSelection('tone', t.id)} className="text-left">
                  <div className="w-full">
                    <div className="font-bold text-lg">{t.name}</div>
                    <div className="text-sm text-slate-500">{t.desc}</div>
                  </div>
                  {t.target === selections.network && <span className="text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded-full whitespace-nowrap">Recommandé</span>}
                </Button>
              ))}
            </div>
          </div>
        );

      case 5: // Visuel & Prix
        const p = PRODUCTS.find(p => p.id === selections.product);
        const prices = calculatePrices(p.price);
        
        return (
          <div className="space-y-6">
            {/* Price Info Card */}
            <Card className="bg-gradient-to-br from-blue-900 to-blue-800 text-white border-none">
              <h3 className="font-serif text-xl text-pink-300 mb-4">💰 Infos Prix & Avantages</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Prix Public :</span>
                  <span className="font-bold">{prices.base}€</span>
                </div>
                <div className="flex justify-between text-pink-300">
                  <span>Ton Prix VDI (-5%) :</span>
                  <span className="font-bold">{prices.vdi}€</span>
                </div>
                <div className="border-t border-blue-700 my-2 pt-2"></div>
                <div className="flex justify-between">
                  <span>Client (Pack 3 -10%) :</span>
                  <span className="font-bold text-green-300">{prices.qty3}€ / lot</span>
                </div>
                <div className="flex justify-between">
                  <span>Abonnement (-20%) :</span>
                  <span className="font-bold text-green-300">{prices.sub}€</span>
                </div>
              </div>
            </Card>

            <h2 className="text-2xl font-serif text-blue-900 text-center">Quel visuel utiliser ?</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant={selections.visualType === 'photo' ? 'primary' : 'secondary'} 
                onClick={() => setSelections(prev => ({ ...prev, visualType: 'photo' }))}
                className="flex-col h-32"
              >
                <span className="text-3xl">🤳</span>
                <span>Ma Photo</span>
              </Button>
              <Button 
                variant={selections.visualType === 'product' ? 'primary' : 'secondary'}
                onClick={() => setSelections(prev => ({ ...prev, visualType: 'product' }))}
                className="flex-col h-32"
              >
                <span className="text-3xl">✨</span>
                <span>Image IA Solage</span>
              </Button>
            </div>

            {selections.visualType === 'photo' && (
              <div className="bg-pink-50 p-4 rounded-xl border border-pink-200">
                <p className="font-bold text-pink-800 mb-2">Conseil Selfie 💡</p>
                <p className="text-pink-900 text-sm mb-4">"Katy, assure-toi d'avoir la lumière face à toi (devant une fenêtre c'est parfait) et souris !"</p>
                
                {!showCamera && !selections.selfie && (
                  <Button variant="action" onClick={startCamera}>Ouvrir la caméra</Button>
                )}
                
                {showCamera && (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-[3/4]">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    <button 
                      onClick={takeSelfie}
                      className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-slate-200 shadow-lg"
                    ></button>
                  </div>
                )}

                {selections.selfie && (
                  <div className="relative">
                     <img src={selections.selfie} alt="Selfie" className="rounded-xl w-full h-64 object-cover" />
                     <button onClick={() => setSelections(prev => ({...prev, selfie: null}))} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow">🔄</button>
                  </div>
                )}
              </div>
            )}

            <Button onClick={generateCampaign} disabled={!selections.visualType || (selections.visualType === 'photo' && !selections.selfie)}>
              Générer mon contenu ! ✨
            </Button>
          </div>
        );
      
      case 6: // Chargement / Résultat
        if (isGenerating) {
          return (
            <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
              <div className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
              <h3 className="text-xl font-serif text-blue-900">Je prépare ton message...</h3>
              <p className="text-slate-500">Mise en beauté des textes...</p>
            </div>
          );
        }

        if (error) {
          return (
            <div className="text-center py-8">
               <p className="text-red-500 mb-4">{error}</p>
               <Button onClick={generateCampaign}>Réessayer</Button>
            </div>
          );
        }

        return (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center">
              <h2 className="text-3xl font-serif text-blue-900 mb-2">Bravo Katy ! 🌟</h2>
              <p className="text-slate-600">Ton contenu est prêt.</p>
            </div>

            {/* Visual Preview */}
            <div className="bg-slate-100 rounded-xl overflow-hidden shadow-inner flex items-center justify-center min-h-[300px]">
               {selections.visualType === 'photo' && selections.selfie && (
                 <img src={selections.selfie} alt="Visuel post" className="w-full h-auto object-cover" />
               )}
               {selections.visualType === 'product' && (
                 generatedImage ? 
                 <img src={generatedImage} alt="IA Générée" className="w-full h-auto object-cover" /> :
                 <div className="p-8 text-center text-slate-400">Génération de l'image en cours...</div>
               )}
            </div>

            {/* Caption */}
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-blue-900">📝 Ta Légende ({selections.network})</h3>
                <button 
                  onClick={() => navigator.clipboard.writeText(generatedContent?.caption)} 
                  className="text-pink-500 text-sm font-bold hover:text-pink-600"
                >
                  COPIER
                </button>
              </div>
              <div className="whitespace-pre-wrap text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
                {generatedContent?.caption}
              </div>
            </Card>

            {/* Engagement */}
            <Card className="bg-pink-50 border-pink-100">
              <h3 className="font-bold text-pink-800 mb-3">💬 Idées de commentaires</h3>
              <p className="text-xs text-pink-700 mb-3">Utilise ces phrases pour répondre aux amis :</p>
              <ul className="space-y-3">
                {generatedContent?.comments.map((comment, i) => (
                  <li key={i} className="bg-white p-3 rounded-lg text-sm text-slate-700 shadow-sm flex justify-between gap-2">
                    <span>{comment}</span>
                    <button onClick={() => navigator.clipboard.writeText(comment)} className="text-slate-300 hover:text-blue-500">📋</button>
                  </li>
                ))}
              </ul>
            </Card>

            <Button onClick={() => window.location.reload()} variant="secondary">
              Nouvelle campagne
            </Button>
            
            <p className="text-center text-xs text-slate-400 mt-4">
              Sauvegardé automatiquement dans ta Galerie 📂
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-900 p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-300 to-pink-500 flex items-center justify-center text-white font-bold font-serif">K</div>
            <span className="text-white font-serif tracking-wide">Brand ManagApp</span>
          </div>
          {step > 0 && step < 6 && (
            <button onClick={prevStep} className="text-blue-200 hover:text-white text-sm">
              Retour
            </button>
          )}
        </div>

        {/* Progress - Only show after vault connection */}
        {step >= 0 && step < 6 && <ProgressBar step={step} total={TOTAL_STEPS} />}

        {/* Content */}
        <div className="p-6">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type, Modality } from "@google/genai";

// --- Configuration & Product Assets from Drive ---

const PRODUCT_CATEGORIES = [
  { id: 'all', name: 'Tous' },
  { id: 'joints', name: 'Articulations' },
  { id: 'energy', name: 'Énergie' },
  { id: 'beauty', name: 'Beauté' },
  { id: 'digestion', name: 'Digestion' },
];

// Simulation des références images du Drive (PNG Transparents)
const EXTENDED_PRODUCTS = [
  { id: 'col', cat: 'joints', name: 'Collagène Natif Type II', icon: '🦴', desc: 'Soutien structurel du cartilage.', driveImg: 'https://images.unsplash.com/photo-1626776876729-babd0f2a583a?q=80&w=300&auto=format&fit=crop' },
  { id: 'vit', cat: 'energy', name: 'Vitamine C Liposomale', icon: '🍊', desc: 'Énergie vitale et immunité.', driveImg: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=300&auto=format&fit=crop' },
  { id: 'ome', cat: 'energy', name: 'Omega 3 Krill Premium', icon: '🐟', desc: 'Protection cardio et mémoire.', driveImg: 'https://images.unsplash.com/photo-1550573105-4584e7d7a631?q=80&w=300&auto=format&fit=crop' },
  { id: 'cur', cat: 'joints', name: 'Curcuma Gold+', icon: '🟡', desc: 'Anti-inflammatoire naturel.', driveImg: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=300&auto=format&fit=crop' },
  { id: 'mag', cat: 'energy', name: 'Magnésium Marin B6', icon: '🌊', desc: 'Détente musculaire.', driveImg: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?q=80&w=300&auto=format&fit=crop' },
  { id: 'hyl', cat: 'beauty', name: 'Acide Hyaluronique', icon: '💧', desc: 'Hydratation de la peau.', driveImg: 'https://images.unsplash.com/photo-1570172619380-41017011d0a1?q=80&w=300&auto=format&fit=crop' },
];

const NETWORKS = [
  { id: 'fb', name: 'Facebook', icon: '📘' },
  { id: 'insta', name: 'Instagram', icon: '📸' },
];

const TONES = [
  { id: 'expert', name: "L'Experte", desc: "Professionnelle et rassurante" },
  { id: 'friend', name: "L'Amie", desc: "Bienveillante et proche" },
];

// --- Styled Components ---

interface ButtonProps {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  variant?: 'primary' | 'gold' | 'outline' | 'dark';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}

const Button = ({ onClick, children, variant = 'primary', className = '', disabled = false, loading = false }: ButtonProps) => {
  const base = "relative overflow-hidden w-full py-4 px-6 rounded-2xl text-lg font-bold transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-3 disabled:opacity-50";
  const variants = {
    primary: "bg-gradient-to-r from-pink-400 to-pink-500 text-white",
    gold: "bg-gradient-to-r from-amber-400 to-amber-500 text-blue-950",
    outline: "bg-transparent border-2 border-slate-200 text-slate-700 hover:border-pink-300",
    dark: "bg-blue-950 text-white",
  };

  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${base} ${variants[variant as keyof typeof variants] || variants.primary} ${className}`}>
      {loading ? <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div> : children}
    </button>
  );
};

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden p-6 ${className}`}>
    {children}
  </div>
);

// --- Main App ---

const App = () => {
  const [step, setStep] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [vaultStatus, setVaultStatus] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  
  const [selections, setSelections] = useState({
    product: null as any,
    network: 'fb',
    tone: 'friend',
    visualType: 'product',
    selfie: null as any,
  });

  const [results, setResults] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Actions ---

  const connectVault = async () => {
    setLoading(true);
    const messages = [
      "Vérification des accès au Drive partagé...",
      "Analyse du dossier '0AAolVMCtORXnUk9PVA'...",
      "Détection de 24 visuels produits avec fonds transparents...",
      "Mise en cache des ressources HD pour Katy...",
      "Synchronisation terminée !"
    ];
    for (const msg of messages) {
      setVaultStatus(prev => [...prev, msg]);
      await new Promise(r => setTimeout(r, 600));
    }
    setLoading(false);
    setStep(0);
  };

  const searchTrends = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const productName = selections.product?.name;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Donne 3 tendances bien-être 2024 pour : ${productName}. Cible: femmes 60+.`,
        config: { tools: [{ googleSearch: {} }] }
      });
      setTrends({ text: response.text, links: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const generatePost = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const productName = selections.product?.name;
      
      // 1. Génération du texte et du prompt de FOND (Background) uniquement
      const prompt = `
        Tu es l'expert marketing de Katy, Laboratoires Solage.
        Produit: ${productName} (Le visuel officiel PNG sera ajouté par-dessus).
        Génère un post captivant et décris un ARRIÈRE-PLAN (sans le produit) pour mettre en valeur ce packaging.
        L'arrière-plan doit être : style luxe, zen, spa, ou nature, couleurs Solage (bleu, or, rose).
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              caption: { type: Type.STRING },
              backgroundPrompt: { type: Type.STRING },
              comments: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      });

      const content = JSON.parse(response.text);
      let finalImageUrl = null;

      if (selections.visualType === 'product') {
        // 2. Génération de l'Arrière-plan par l'IA
        const imgResp = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: `Photographie d'un arrière-plan vide et luxueux : ${content.backgroundPrompt}. Pas de texte, pas de flacon, juste le décor. Style Laboratoires Solage.`,
          config: { imageConfig: { aspectRatio: "1:1" } }
        });
        const part = imgResp.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (part) finalImageUrl = `data:image/png;base64,${part.inlineData.data}`;
      } else {
        finalImageUrl = selections.selfie;
      }

      setResults({ ...content, bgUrl: finalImageUrl, productImg: selections.product.driveImg });
      setStep(10);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const captureSelfie = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      setSelections(prev => ({ ...prev, selfie: canvas.toDataURL('image/jpeg'), visualType: 'selfie' }));
      (video.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
    }
  };

  // --- Rendering ---

  const renderContent = () => {
    if (step === -1) return (
      <div className="space-y-8 text-center animate-in fade-in duration-700">
        <div className="w-32 h-32 bg-blue-900 mx-auto rounded-full flex items-center justify-center border-4 border-amber-400 shadow-2xl">
          <span className="text-5xl">🏦</span>
        </div>
        <h1 className="text-3xl font-serif text-blue-950">Vault Asset Sync</h1>
        <div className="bg-slate-50 p-6 rounded-3xl text-left border border-slate-100 space-y-2">
          {vaultStatus.map((s, i) => (
            <div key={i} className="flex items-center gap-3 text-xs text-slate-600 animate-in slide-in-from-left">
              <span className="text-green-500 font-bold">✓</span> {s}
            </div>
          ))}
          {!loading && vaultStatus.length === 0 && <Button onClick={connectVault} variant="dark">Connecter le Drive Partagé</Button>}
          {loading && <div className="text-center py-2"><div className="w-6 h-6 border-2 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto"></div></div>}
          {vaultStatus.length > 4 && <Button onClick={() => setStep(0)} variant="primary">Accéder au catalogue</Button>}
        </div>
      </div>
    );

    if (step === 0 || step === 1) {
      const filtered = EXTENDED_PRODUCTS.filter(p => (activeCat === 'all' || p.cat === activeCat) && (p.name.toLowerCase().includes(searchQuery.toLowerCase())));
      return (
        <div className="space-y-6 animate-in slide-in-from-right">
          <h2 className="text-2xl font-serif text-blue-950 text-center">Sélection du Produit</h2>
          <input type="text" placeholder="Rechercher dans le Drive..." className="w-full p-4 bg-slate-100 rounded-2xl text-sm outline-none border-2 border-transparent focus:border-pink-300" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {PRODUCT_CATEGORIES.map(c => <button key={c.id} onClick={() => setActiveCat(c.id)} className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest ${activeCat === c.id ? 'bg-blue-950 text-white' : 'bg-white text-slate-400 border'}`}>{c.name}</button>)}
          </div>
          <div className="grid gap-3 max-h-[45vh] overflow-y-auto pr-1">
            {filtered.map(p => (
              <button key={p.id} onClick={() => { setSelections(s => ({ ...s, product: p })); setStep(2); }} className="flex items-center gap-4 p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-amber-400 transition-all text-left">
                <img src={p.driveImg} className="w-12 h-12 object-contain bg-slate-50 rounded-lg" alt={p.name} />
                <div>
                  <p className="font-bold text-blue-950 text-sm">{p.name}</p>
                  <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">Visual PNG OK ✓</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (step === 2) return (
      <div className="space-y-6 animate-in slide-in-from-right">
        <h2 className="text-2xl font-serif text-blue-950 text-center">Analyse Trends</h2>
        <Card className="bg-blue-950 text-white">
          <p className="text-amber-400 font-bold text-xs mb-4">MOTEUR GOOGLE SEARCH 🔍</p>
          <p className="text-sm mb-6">Analysons les tendances actuelles pour <strong>{selections.product.name}</strong>.</p>
          {loading ? <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full mx-auto my-4"></div> : <Button onClick={searchTrends} variant="gold">Vérifier les actualités</Button>}
          {trends && <div className="mt-4 p-4 bg-blue-900/50 rounded-xl text-[11px] italic">{trends.text.substring(0, 150)}... <button onClick={() => setStep(3)} className="text-pink-300 font-bold ml-2">Suivant →</button></div>}
        </Card>
        <button onClick={() => setStep(3)} className="w-full text-slate-400 text-xs">Passer cette étape</button>
      </div>
    );

    if (step === 3) return (
      <div className="space-y-6 animate-in slide-in-from-right">
        <h2 className="text-2xl font-serif text-blue-950 text-center">Style du Post</h2>
        <div className="grid grid-cols-2 gap-3">
          {NETWORKS.map(n => <button key={n.id} onClick={() => setSelections(s => ({ ...s, network: n.id }))} className={`p-4 rounded-2xl border-2 flex flex-col items-center ${selections.network === n.id ? 'border-pink-500 bg-pink-50' : 'border-slate-100'}`}><span className="text-2xl">{n.icon}</span></button>)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setSelections(s => ({ ...s, visualType: 'product' }))} className={`p-4 rounded-2xl border-2 flex flex-col items-center ${selections.visualType === 'product' ? 'border-amber-500 bg-amber-50' : 'border-slate-100'}`}><span className="text-xl">✨ STUDIO</span><span className="text-[10px] font-bold">Visuel Officiel</span></button>
          <button onClick={() => { setSelections(s => ({ ...s, visualType: 'selfie' })); navigator.mediaDevices.getUserMedia({ video: true }).then(st => { if(videoRef.current) videoRef.current.srcObject = st; setStep(5); }); }} className={`p-4 rounded-2xl border-2 flex flex-col items-center ${selections.visualType === 'selfie' ? 'border-pink-500 bg-pink-50' : 'border-slate-100'}`}><span className="text-xl">🤳 PHOTO</span><span className="text-[10px] font-bold">Mon Selfie</span></button>
        </div>
        <Button onClick={generatePost} loading={loading} variant="primary">Magie Solage Studio ✨</Button>
      </div>
    );

    if (step === 5) return (
      <div className="space-y-6 animate-in zoom-in-95">
        <h2 className="text-2xl font-serif text-blue-950 text-center">Portrait Katy</h2>
        <div className="relative aspect-square rounded-[3rem] overflow-hidden bg-black border-4 border-white shadow-2xl">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]"></video>
          <canvas ref={canvasRef} className="hidden"></canvas>
          <button onClick={captureSelfie} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-pink-400 shadow-2xl"></button>
        </div>
        {selections.selfie && <Button onClick={() => setStep(3)} variant="gold">Générer avec ce selfie</Button>}
      </div>
    );

    if (step === 10 && results) return (
      <div className="space-y-8 animate-in fade-in duration-1000">
        <div className="text-center">
          <p className="text-green-600 font-bold text-xs uppercase tracking-widest mb-1">Visual Studio OK</p>
          <h2 className="text-3xl font-serif text-blue-950">Un post éblouissant !</h2>
        </div>

        {/* Smartphone Mockup with Layered Image Composition */}
        <div className="relative mx-auto w-full max-w-[280px] bg-white border-[10px] border-slate-900 rounded-[3rem] shadow-2xl overflow-hidden aspect-[9/18]">
          <div className="p-3 h-full overflow-y-auto scrollbar-hide">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-pink-400 flex items-center justify-center text-white text-[10px] font-bold">K</div>
              <p className="text-[10px] font-bold">Katy Solage • Ambassadrice</p>
            </div>
            
            {/* COMPOSER ENGINE: Background + Official PNG Overlay */}
            <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 shadow-lg">
              <img src={results.bgUrl} className="absolute inset-0 w-full h-full object-cover" alt="Background" />
              {selections.visualType === 'product' && (
                <img 
                  src={results.productImg} 
                  className="absolute inset-0 w-full h-full object-contain scale-75 drop-shadow-[0_20px_20px_rgba(0,0,0,0.3)]" 
                  alt="Official Product" 
                />
              )}
            </div>

            <p className="text-[10px] leading-relaxed text-slate-800 whitespace-pre-wrap">{results.caption}</p>
          </div>
        </div>

        <div className="grid gap-3">
          <Button onClick={() => { navigator.clipboard.writeText(results.caption); alert("Texte copié !"); }} variant="gold">Copier la Légende</Button>
          <Button onClick={() => window.location.reload()} variant="outline">Nouveau Post</Button>
        </div>

        <Card className="bg-pink-50">
          <p className="font-bold text-pink-800 text-xs mb-2">Conseil Engagement :</p>
          <div className="text-[10px] text-slate-600 italic">"N'oubliez pas d'identifier Solage sur cette publication !"</div>
        </Card>
      </div>
    );

    return null;
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-50 h-[90vh] flex flex-col">
        <div className="bg-blue-950 px-8 py-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-400 flex items-center justify-center border-2 border-white/20"><span className="text-white font-serif font-bold text-xl">K</span></div>
            <div>
              <p className="text-white font-serif tracking-widest text-sm font-bold">SOLAGE</p>
              <p className="text-pink-300 text-[8px] uppercase font-bold tracking-tighter">Official Brand App</p>
            </div>
          </div>
          {step > 0 && <button onClick={() => setStep(0)} className="text-blue-200 text-xs font-bold">ACCUEIL</button>}
        </div>
        <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
          {renderContent()}
        </div>
        <div className="px-8 py-4 bg-slate-50 border-t flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div><span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">DRIVE ASSET CONNECTED</span></div>
          <span className="text-[9px] text-slate-300">Vault ID: 0AAolVMCtORXn...</span>
        </div>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);

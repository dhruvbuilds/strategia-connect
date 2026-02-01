import React, { useState, useEffect, useRef, useMemo, useCallback, Component } from 'react';
import { db } from './firebase';
import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';

// Error Boundary to prevent crashes from breaking the entire app
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('STRATEGIA Connect Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          background: '#080c14', 
          color: '#fff', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😅</div>
          <h1 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Something went wrong</h1>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem' }}>
            Don't worry, your data is safe. Please refresh the page.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              background: '#e63946',
              color: '#fff',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const StrategiaConnect = () => {
  // Strategia Logo - place this image in your public folder as 'strategia-logo.png'
  const STRATEGIA_LOGO = process.env.PUBLIC_URL + '/strategia-logo.png';
  
  // Initialize state from localStorage if available (prevents reset on refresh)
  const getStoredState = (key, defaultValue) => {
    try {
      const stored = localStorage.getItem(`strategia_${key}`);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  const [view, setView] = useState(() => getStoredState('view', 'landing'));
  const [user, setUser] = useState(() => getStoredState('user', null));
  const [profiles, setProfiles] = useState([]);
  const [connections, setConnections] = useState(() => getStoredState('connections', []));
  const [sentRequests, setSentRequests] = useState(() => getStoredState('sentRequests', []));
  const [receivedRequests, setReceivedRequests] = useState(() => getStoredState('receivedRequests', []));
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [report, setReport] = useState(null);
  const [isAdmin, setIsAdmin] = useState(() => getStoredState('isAdmin', false));
  const [adminTab, setAdminTab] = useState('dashboard');
  const [feedbacks, setFeedbacks] = useState(() => getStoredState('feedbacks', []));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [announcements, setAnnouncements] = useState(() => getStoredState('announcements', []));
  const [showQR, setShowQR] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [appTab, setAppTab] = useState('discover'); // App tab state at parent level
  const [networkError, setNetworkError] = useState(false);

  // Persist important state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('strategia_view', JSON.stringify(view));
    } catch (e) {}
  }, [view]);

  useEffect(() => {
    try {
      localStorage.setItem('strategia_user', JSON.stringify(user));
    } catch (e) {}
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem('strategia_connections', JSON.stringify(connections));
    } catch (e) {}
  }, [connections]);

  useEffect(() => {
    try {
      localStorage.setItem('strategia_sentRequests', JSON.stringify(sentRequests));
    } catch (e) {}
  }, [sentRequests]);

  useEffect(() => {
    try {
      localStorage.setItem('strategia_receivedRequests', JSON.stringify(receivedRequests));
    } catch (e) {}
  }, [receivedRequests]);

  useEffect(() => {
    try {
      localStorage.setItem('strategia_isAdmin', JSON.stringify(isAdmin));
    } catch (e) {}
  }, [isAdmin]);

  useEffect(() => {
    try {
      localStorage.setItem('strategia_feedbacks', JSON.stringify(feedbacks));
    } catch (e) {}
  }, [feedbacks]);

  useEffect(() => {
    try {
      localStorage.setItem('strategia_announcements', JSON.stringify(announcements));
    } catch (e) {}
  }, [announcements]);

  // Debounce search for performance
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const ADMIN = 'VanshuDogu';
  const avatarOptions = ['👨‍💼', '👩‍💼', '👨‍💻', '👩‍💻', '👨‍🎓', '👩‍🎓'];
  
const allowlist = [
    // Test accounts
    { email: 'test1@strategia.com', phone: '+911111111111', name: 'Test User 1' },
    { email: 'test2@strategia.com', phone: '+912222222222', name: 'Test User 2' },
    { email: 'test3@strategia.com', phone: '+913333333333', name: 'Test User 3' },
    { email: 'test4@strategia.com', phone: '+914444444444', name: 'Test User 4' },
    { email: 'test5@strategia.com', phone: '+915555555555', name: 'Test User 5' },
    // Real participants
    { email: 'fate.elec@gmail.com', phone: '+917395997821', name: 'Fatema' },
    { email: 'jrtheo0914@gmail.com', phone: '+917824024015', name: 'Joanne Rose Theopaul' },
    { email: 'sanjaycshekhar@gmail.com', phone: '+919150765485', name: 'SANJAY SHEKHAR C' },
    { email: 'jeetagwl2007@gmail.com', phone: '+918940904433', name: 'Jeet Agarwal' },
    { email: 'prarthana45678@gmail.com', phone: '+916381360531', name: 'Prarthana' },
    { email: 'mithelesh.dm274036@greatlakes.edu.in', phone: '+919176677701', name: 'K Mithelesh' },
    { email: 'jitendrakr785793@gmail.com', phone: '+917277402908', name: 'Jitendra Kumar' },
    { email: 'forushubham@gmail.com', phone: '+916203522916', name: 'Shubham Kumar' },
    { email: '24mb0074@iitism.ac.in', phone: '+918910433461', name: 'Skandh Gupta' },
    { email: 'sec24cj012@sairamtap.edu.in', phone: '+917200116250', name: 'Dharshini K' },
    { email: 'sec20cb020@sairamtap.edu.in', phone: '+918667858430', name: 'Magesvaran B' },
    { email: 'prasoonsenthilkumar05@gmail.com', phone: '+918248896321', name: 'Prasoon s' },
    { email: 'srihariprasath0@gmail.com', phone: '+919363504010', name: 'Sri Hari Prasath M' },
    { email: 'jaivishuwaamirthalingam@gmail.com', phone: '+917708267501', name: 'Jai Vishuwa A' },
    { email: 'malardhiyaneeswaran@gmail.com', phone: '+919150789233', name: 'Malar D P' },
    { email: 'm.aadhitiya@gmail.com', phone: '+918925480051', name: 'Aadhitiya Murali' },
    { email: 'mailmearchisha@gmail.com', phone: '+918778139540', name: 'Archisha Rajesh' },
    { email: 'nikhil.david26@sibm.edu.in', phone: '+919566096459', name: 'Peter Nikhil David' },
    { email: '2401110028@ptuniv.edu.in', phone: '+917548878805', name: 'K Krti Koumar' },
    { email: 'su15012007@gmail.com', phone: '+917349260969', name: 'Uday Singh' },
    { email: 'gladwinj2006@gmail.com', phone: '+917200421106', name: 'GLADWIN JOSHUA P' },
    { email: 'hamdu42002@gmail.com', phone: '+919940195570', name: 'Mohammedd  Shahid' },
    { email: 'mokshiths001@gmail.com', phone: '+919398710949', name: 'Thutukuri Mokshith Sai' },
    { email: 'nithinashok433@gmail.com', phone: '+919840811770', name: 'Nithin A' },
    { email: 'vishwhaa2465@gmail.com', phone: '+918838031053', name: 'Vishwhaa' },
    { email: 'gtkgoutham@gmail.com', phone: '+919620858652', name: 'Goutham Srinath' },
    { email: 'raghavi.sn27@gmail.com', phone: '+918778437408', name: 'Raghavi N' },
    { email: 'sadhanaaprabhakar@gmail.com', phone: '+919790823111', name: 'Sadhana Prabhakar' },
    { email: 'paddu10106@gmail.com', phone: '+918825731994', name: 'Padmasini' },
    { email: 'moulikakj@gmail.com', phone: '+919790932899', name: 'Moulika S' },
    { email: '2513711043011@mopvaishnav.ac.in', phone: '+919444621353', name: 'Janithra C' },
    { email: 'arjunnpprasad@gmail.com', phone: '+918925998897', name: 'Arjun Prasad D' },
    { email: 'varshavenkatesh2705@gmail.com', phone: '+917358662796', name: 'Varsha v' },
    { email: 'avikshit19@gmail.com', phone: '+917299389933', name: 'Avikshit Vijay V' },
    { email: 'ipsitamohapatra1705@gmail.com', phone: '+916379675200', name: 'Ipsita Mohapatra' },
    { email: 'lakshitha2195@gmail.com', phone: '+919025087212', name: 'Lakshitha' },
    { email: 'jayasanthoshisrinivasan@gmail.com', phone: '+917708192344', name: 'Jaya Santhoshi' },
    { email: 'judah731212@gmail.com', phone: '+919841725093', name: 'judah fredrick' },
    { email: 'sebastinjothi10@gmail.com', phone: '+917695953780', name: 'SEBASTIN A' },
    { email: 'shreymathur13@gmail.com', phone: '+917665010073', name: 'Shrey Mathur' },
    { email: 'janani84750@gmail.com', phone: '+916379484750', name: 'JANANI P' },
    { email: 'khandelwal.divya1704@gmail.com', phone: '+916379286747', name: 'Divya Khandelwal' },
    { email: 'aishwaryaanandmehta@gmail.com', phone: '+919176915752', name: 'Aishwarya Mehta A' },
    { email: 'pupuchennai@gmail.com', phone: '+917010038467', name: 'Aryan Ghosh' },
    { email: 'akanksha.panigrahi.16487@gmail.com', phone: '+919104530267', name: 'Akanksha Panigrahi' },
    { email: 'lyonel.achillesv@gmail.com', phone: '+917200113909', name: 'Lyonel Achilles' },
    { email: 'sherinaselvaranic@gmail.com', phone: '+917449234285', name: 'C.Sherina Selvarani' },
    { email: 'sarathichanjee@gmail.com', phone: '+919003210523', name: 'R Sarathi Chandran' },
    { email: 'rithika.saravanan1285@gmail.com', phone: '+919042631285', name: 'Rithika Saravanan' },
    { email: 'shruthivuppala.007@gmail.com', phone: '+918248800477', name: 'Shruthi V' },
    { email: 'shashanks4574@gmail.com', phone: '+916361644845', name: 'Shashank S' },
    { email: 'yokesverenkr2005@gmail.com', phone: '+919444678403', name: 'Yokesveren K R' },
    { email: 'balajiselvarajofficial@gmail.com', phone: '+918608315439', name: 'Balaji S' },
    { email: 'aksowmi154@gmail.com', phone: '+919345746569', name: 'M Sowmiya' },
    { email: 'jayakumar212007@gmail.com', phone: '+919597582083', name: 'JAYAKUMAR. S' },
    { email: 'srijayakarti@gmail.com', phone: '+918838732479', name: 'Sri Jaya Karti S' },
    { email: 'aathilmohamed428@gmail.com', phone: '+917418044318', name: 'Mohamed Aathil .S' },
    { email: 'harikrishnaaoffl@gmail.com', phone: '+919344451344', name: 'Harikrishnaa' },
    { email: 'yeah.its.akash@gmail.com', phone: '+919884038912', name: 'Akash B' },
    { email: 'sonikittu781@gmail.com', phone: '+919342921448', name: 'Kittu soni' },
    { email: 'prachi_gupta@ug29.mesaschool.co', phone: '+917205746006', name: 'Prachi Gupta' },
    { email: 'harenisri29@gmail.com', phone: '+917845888772', name: 'Hareni C' },
    { email: 'sonalisc2023@gmail.com', phone: '+919498031450', name: 'Sonali S.C.' },
    { email: 'rdsrinath@gmail.com', phone: '+919884880228', name: 'Srinath RD' },
    { email: 'akshita_verma@pg26.mesaschool.co', phone: '+917710790454', name: 'Akshita' },
    { email: 'sathyanandhini2006@gmail.com', phone: '+919080547507', name: 'Nandhini A' },
    { email: 'eshan_malani@ug29.mesaschool.co', phone: '+919504275275', name: 'Eshan Vikrant Malani' },
    { email: 'bhartiyahrishi@gmail.com', phone: '+919498038141', name: 'Hrishi Bhartiya' },
    { email: 'akshat25310038@snuchennai.edu.in', phone: '+918712702607', name: 'Akshat Joshi' },
    { email: 'saikarthick2121@gmail.com', phone: '+918310237979', name: 'Sai Karthick KG' },
    { email: 'harikaran.ramesh06@gmail.com', phone: '+917708161551', name: 'Sai siddharth' },
    { email: '25ubc071@loyolacollege.edu', phone: '+918668187853', name: 'Siddhant H Sakhrani' },
    { email: 'srijan_rastogi@pg26.mesaschool.co', phone: '+917007704770', name: 'Srijan Rastogi' },
    { email: 'joelvishanth10@gmail.com', phone: '+918148175260', name: 'JOEL VISHANTH.P' },
    { email: 'pranaav.ramakrishna@gmail.com', phone: '+919940216698', name: 'Pranaav Ramakrishna' },
    { email: 'veydanth123@gmail.com', phone: '+917305028832', name: 'Veydanth Bajaj' },
    { email: 'shafeen255@gmail.com', phone: '+918526271815', name: 'Mohamed Shafeen' },
    { email: 'arvindh272007@gmail.com', phone: '+919884910307', name: 'Arvindh JK' },
    { email: 'karthikeydmanoj@gmail.com', phone: '+918086911011', name: 'Karthikey Manoj' },
    { email: 'mvkanted@gmail.com', phone: '+919150123727', name: 'Mehul kanted' },
    { email: 'hemanthsanjay28@gmail.com', phone: '+918838178643', name: 'Hemanth' },
    { email: 'kirankarthee5@gmail.com', phone: '+918754934888', name: 'Kiran Karthee Muralidharan' },
    { email: 'ashazaslam1466@gmail.com', phone: '+918925775997', name: 'Ashaz Syed Aslam' },
    { email: 'shreyakannan345@gmail.com', phone: '+917358338394', name: 'Shreya Kannan' },
    { email: 'thamaannasrinivasan@gmail.com', phone: '+919789863179', name: 'Thamaanna Sri VS' },
    { email: 'ronaldriyann@mail.com', phone: '+917603862248', name: 'Riyann' },
    { email: 'raniariyaz1@gmail.com', phone: '+919003292330', name: 'Rania' },
    { email: 'ananyakpanorama@gmail.com', phone: '+917358753170', name: 'Ananya K. Panorama' },
    { email: 'suditisolanki17@gmail.com', phone: '+918390128390', name: 'Suditi' },
    { email: 'harshithasocial00@gmail.com', phone: '+919840406023', name: 'Harshitha S' },
    { email: 'mbhuvanaa23@gmail.com', phone: '+917200394733', name: 'M S MOGANA BHUVANAA' },
    { email: '202302013@mrcas.edu.in', phone: '+917904957657', name: 'Pranav B K' },
    { email: 'jerlinishiah@gmail.com', phone: '+919344632553', name: 'Jerlin Ishiah S R' },
    { email: 'sharonarpitha09@gmail.com', phone: '+918489948994', name: 'Sharon Arpitha K' },
    { email: 'chrisphapraisy@gmail.com', phone: '+918925172876', name: 'Praisy Chrispha B' },
    { email: '24su1510065@student.hindustanuniv.ac.in', phone: '+919640438146', name: 'Dawood Fawaz' },
    { email: 'antonygerald1972@gmail.com', phone: '+919500121296', name: 'Adalina A' },
    { email: 'rsrivathsan-25pgdm@gibs.edu.in', phone: '+917530068722', name: 'Srivathsan R' },
    { email: 'shahid14108@gmail.com', phone: '+918125148694', name: 'Mohamed Shahid' },
    { email: 'divyat29112006@gmail.com', phone: '+919444937608', name: 'Divya T' },
    { email: 'ramballistx22@gmail.com', phone: '+917904526536', name: 'BARATH RAM M.' },
    { email: 'rishabhdadhwal24@gmail.com', phone: '+919606301803', name: 'Rishabh Dadhwal' },
    { email: 'snehagayatran@gmail.com', phone: '+919791163865', name: 'R.Sneha' },
    { email: 'arunkrish311205@gmail.com', phone: '+919360827726', name: 'ARUN PRASATH J K' },
    { email: 'nafielafathima@gmail.com', phone: '+919543221881', name: 'Nafiela Fathima M' },
    { email: 'srinithiu29@gmail.com', phone: '+919360428315', name: 'R Srinithi' },
    { email: 'kavinsundar105@gmail.com', phone: '+919962098790', name: 'Kavin Sundar Pillai' },
    { email: 'aurimitadutta@gmail.com', phone: '+917604938027', name: 'Aurimita Dutta Chowdhury' },
    { email: 'vigneshiss6943@gmail.com', phone: '+916382881482', name: 'Vignesh' },
    { email: 'bpat2903@gmail.com', phone: '+919810666991', name: 'Bhushan Patil' },
    { email: 'anantharamuduneet2023@gmail.com', phone: '+919390417094', name: 'Nalliboyina Anantha Ramudu' },
    { email: '312825104128@act.edu.in', phone: '+917904457272', name: 'Ragul S' },
    { email: 'jiya_surana@ug29.mesaschool.co', phone: '+916380921032', name: 'Jiya Surana' },
    { email: 'manishasuresh1227@gmail.com', phone: '+918220528553', name: 'Manisha M S' },
    { email: 'zelenepatel2@gmail.com', phone: '+919909877416', name: 'Zelene Patel' },
    { email: 'vedantsharma.s@icloud.com', phone: '+917383038119', name: 'Vedant Sharma' },
    { email: 'karthikeshdenver@gmail.com', phone: '+919150345616', name: 'Karthikesh' },
    { email: 'vishnuaravindhr@gmail.com', phone: '+917305774555', name: 'Vishnu Aravindh' },
    { email: '24lscf23@kristujayanti.com', phone: '+918087268219', name: 'Jignesh Rajendra Metha' },
    { email: 'abdulmaraikkayar398@gmail.com', phone: '+919080287768', name: 'NAINA MARAIKKAYAR M' },
    { email: '23comb16@kristujayanti.com', phone: '+919059600529', name: 'Epuri Akash' },
    { email: 'tareekhussain47@gmail.com', phone: '+919789069199', name: 'Tareek Hussain S' },
    { email: 'ch24b092@smail.iitm.ac.in', phone: '+918902737764', name: 'Sagnik Chakrabarty' },
    { email: 'anirudhpradeep13@gmail.com', phone: '+918136954375', name: 'Anirudh Shoma Pradeep' },
    { email: '23comf48@kristujayanti.com', phone: '+918296364011', name: 'S Rishabh Ronaldo' },
    { email: 'jeevithaashree2107@gmail.com', phone: '+919789902203', name: 'Jeevithaa' },
    { email: 'guptaarchit654321@gmail.com', phone: '+919311349922', name: 'Archit Gupta' },
    { email: 'mathibalachandar@gmail.com', phone: '+918838182815', name: 'Mathialagan B' },
    { email: 'laksshayahshreers@gmail.com', phone: '+919080352606', name: 'Tharuna.K' },
    { email: 'hayma24magesh@gmail.com', phone: '+919962928188', name: 'Haymasree M' },
    { email: 'ritweakin@gmail.com', phone: '+919884330790', name: 'Rithvika Murali' },
    { email: 'abhishek_mandot2023@cms.ac.in', phone: '+919840826519', name: 'Abhishek Mandot' },
    { email: 'f24114.nishesh@liba.edu', phone: '+919025966401', name: 'Nishesh N' },
    { email: 'f24099.mohammed@liba.edu', phone: '+917010131024', name: 'Mohammed Harris K' },
    { email: 'ms245118144@bhc.edu.in', phone: '+918610250135', name: 'Reshmika N' },
    { email: 'contactarjun11@gmail.com', phone: '+919600978979', name: 'Arjun Krishna' },
    { email: 'jmanov010@gmail.com', phone: '+919445508587', name: 'J Manov' },
    { email: 'veersethia06@gmail.com', phone: '+919444902689', name: 'Veer Sethia' },
    { email: 'elayanb2008@gmail.com', phone: '+918072346354', name: 'Elaya Narayanan' },
    { email: 'kiaradsouza1907@gmail.com', phone: '+916385043888', name: 'Kiara Ann dsouza' },
    { email: 'vk4904656@gmail.com', phone: '+917200433356', name: 'Vivek H' },
    { email: 'goelananya56@gmail.com', phone: '+919952002160', name: 'Ananya Goel' },
    { email: '24su1510002@student.hindustanuniv.ac.in', phone: '+917358444008', name: 'PG Mithun' },
    { email: 'emiltittu4@gmail.com', phone: '+918925630900', name: 'Emil tittu' },
    { email: 'siddharth.rj06@gmail.com', phone: '+919840097104', name: 'Siddharth Raja Jothi Baskar' },
    { email: 'mohammed027aslam@gmail.com', phone: '+919500179794', name: 'A.MOHAMMED ASLAM' },
    { email: 'saaidhivyesh@gmail.com', phone: '+919345094130', name: 'Saai Dhivyesh' },
    { email: '24cmh27@wcc.edu.in', phone: '+916383429948', name: 'Reena C S' },
    { email: 'bfsara17@gmail.com', phone: '+917708255084', name: 'Sara Fathima' },
    { email: '23uco243@loyolacollege.edu', phone: '+919840097104', name: 'Siddharth R' },
    { email: 'ca.sophia2006@gmail.com', phone: '+917339091737', name: 'Catherine Sophia S' },
    { email: 'shailinyaelcharis@gmail.com', phone: '+917845413906', name: 'Shailin Yael Charis S' },
    { email: '25cmg050@wcc.edu.in', phone: '+918637428062', name: 'Priya Dharshni A' },
    { email: 'sandhiyasiva587@gmail.com', phone: '+917299148939', name: 'S SANDHIYA' },
    { email: 'maadeshvar4@gmail.com', phone: '+919042621929', name: 'KS Maadeshvar' },
    { email: 'raihanmohamed56@gmail.com', phone: '+919884077857', name: 'Mohamed Raihan' },
    { email: 'harish.s0918@gmail.com', phone: '+917598904579', name: 'HARISH.S' },
    { email: 'nidhisureshkumar2308@gmail.com', phone: '+919840909750', name: 'Nidhi S' },
    { email: 'varnika022@gmail.com', phone: '+919840370516', name: 'Varnika' },
    { email: 'shreemayishreeraam@gmail.com', phone: '+919360514328', name: 'Shreemayi S' },
    { email: 'sumitmehta99400@gmail.com', phone: '+919940067294', name: 'Sumit Mehta' },
    { email: 'taranbalram7@gmail.com', phone: '+918838697006', name: 'Taran Balram' },
    { email: 'venikareddy23@gmail.com', phone: '+919600668903', name: 'Venika' },
    { email: 'ankushsahu5421@gmail.com', phone: '+919100314091', name: 'Ankush Sahu' },
    { email: 'shahsaishivam@gmail.com', phone: '+918779800754', name: 'Saishivam Shah' },
    { email: 'vabhisheklc@gmail.com', phone: '+917639353211', name: 'Jayashanma M' },
    { email: 'bnandita164@gmail.com', phone: '+917305972635', name: 'Nandita B' },
    { email: 'thameemsumaiya1999@gmail.com', phone: '+919976360888', name: 'Sumaiya Thasneem T' },
    { email: '24uco038@loyolacollege.edu', phone: '+918110907172', name: 'Vishal N V' },
    { email: 'reachsudarshanm@gmail.com', phone: '+918838642547', name: 'Sudarshan Manoharan' },
    { email: 'jn.roshan2019@gmail.com', phone: '+918838483994', name: 'J.N Roshan' },
    { email: 'nivupersonal@gmail.com', phone: '+917010658819', name: 'Nivedhitha N' },
    { email: 'thilaak13@gmail.com', phone: '+919677005858', name: 'Thilaak H' },
    { email: 'dineshkumarsathishkumar18@gmail.com', phone: '+916374562315', name: 'Dinesh Kumar S' },
    { email: '231201048@rajalakshmi.edu.in', phone: '+918072003733', name: 'Lokesh A' },
    { email: 'ibrahimabbaschinwala@gmail.com', phone: '+919342056851', name: 'Ibrahim Abbas' },
    { email: 'adhisheshan.007@gmail.com', phone: '+917708446338', name: 'Adhi Sheshan S' },
    { email: 'vidhya.knowhow@gmail.com', phone: '+917303522866', name: 'Vidhya Subramanian' },
    { email: 'hemaharish741@gmail.com', phone: '+918056177947', name: 'Hema Harrish k' },
    { email: '24d122@amjaincollege.edu.in', phone: '+917338847902', name: 'Tanubbhav vs' },
    { email: 'sahanatejas2006@gmail.com', phone: '+919363986971', name: 'K.SAHANA' },
    { email: 'yaghavr@gmail.com', phone: '+919150738433', name: 'R.Yaghav' },
    { email: 'aravinth.v@mba.christuniversity.in', phone: '+919585383518', name: 'Aravinth V' },
    { email: 'devanshuparakh67@gmail.com', phone: '+919043961054', name: 'Devanshu' },
    { email: 'mohitbaghmar.25@gmail.com', phone: '+918125425503', name: 'R.MOHIT JAIN' },
    { email: 'reshma.s.2024.mba@rajalakshmi.edu.in', phone: '+919345844255', name: 'Reshma S' },
    { email: 'madhumithabl28@gmail.com', phone: '+918825797350', name: 'Madhumitha B' },
    { email: 'ronaldriyann@gmail.com', phone: '+917603862248', name: 'Riyann Ronald' },
    { email: 'sabareeshkarthik6@gmail.com', phone: '+919150565074', name: 'Sabareesh Karthik' },
    { email: 'madhumitha.m@mba.christuniversity.in', phone: '+917339555215', name: 'Madhumitha M' },
    { email: 'mohankingmr7@gmail.com', phone: '+919941903691', name: 'Mohan raj' },
    { email: 'vishal.ramachandran@mba.christuniversity.in', phone: '+917259191720', name: 'Vishal Ramachandran' },
    { email: 'madhumithamareesan@gmail.com', phone: '+917339555215', name: 'Madhumitha M' },
    { email: 'reyag2008@gmail.com', phone: '+917904243399', name: 'Reya' },
    { email: 'sist.bcomgeneral@gmail.com', phone: '+917305778576', name: 'Vyash velan.S' },
    { email: 'angelpaulantony@gmail.com', phone: '+919567612381', name: 'ANGEL PAUL' },
    { email: 'santo.apple16@gmail.com', phone: '+916374231825', name: 'Santhosh Kumar B' },
    { email: 'sooryakalako@outlook.com', phone: '+919444004825', name: 'Sooryakala KO' },
    { email: 'kavin.k.2025.mba@rajalakshmi.edu.in', phone: '+917448521276', name: 'Kavin k' },
    { email: 'kaviyau123@gmail.com', phone: '+917358548097', name: 'U kaviya' },
    { email: 'melbingeorge05@gmail.com', phone: '+917869178422', name: 'Melbin George' },
    { email: '25uco180@loyolacollege.edu', phone: '+919940614979', name: 'Kowshik.d.y' },
    { email: 'dikshajha0508@gmail.com', phone: '+919791067100', name: 'DIKSHA JHA' },
    { email: 'aadhit230@gmail.com', phone: '+918838199509', name: 'Aadhit Saravanan' },
    { email: 'tkarthicksrinivas@gmail.com', phone: '+919080207704', name: 'Karthick Srinivas.T' },
    { email: 'shriramvijaybaskar@gmail.com', phone: '+919791415151', name: 'Shriram Vijaybaskar' },
    { email: 'aparna1.murali@gmail.com', phone: '+919384819476', name: 'APARNA M' },
    { email: '251571601019@crescent.education', phone: '+919080177488', name: 'Mithra' },
    { email: 'jenniferjosfina2006@gmail.com', phone: '+919042314041', name: 'Jennifer Josfina' },
    { email: 'anshuldav05@gamil.com', phone: '+919345986105', name: 'Anshul gupta' },
    { email: 'ton06krishna@gmail.com', phone: '+919940230532', name: 'Boopesh S' },
    { email: 'ireneacca10@gmail.com', phone: '+917418356850', name: 'Irene Sharon Padmanaban' },
    { email: 'sooryakala.ko@gmail.com', phone: '+919444004825', name: 'Sooryakala ko' },
    { email: 'applicafo.condition723@aleeas.com', phone: '+917046871464', name: 'Sandeep Jagdish' },
    { email: 'anshuldav05@gmail.com', phone: '+919345986105', name: 'Anshul gupta' },
    { email: 'chhavikhicha@gmail.com', phone: '+919499953255', name: 'Chhavi Khicha' },
    { email: 'sriranjanx@gmail.com', phone: '+917358011726', name: 'Sri Ranjan' },
    { email: '25ust077@loyolacollege.edu', phone: '+919445316389', name: 'Monish' },
    { email: 'samukta.econ@gmail.com', phone: '+919363357118', name: 'Samukta' },
    { email: 'aarthyaakash2007@gmail.com', phone: '+918122729297', name: 'Aarthy. A' },
    { email: 'kamaleshgunasekar01@gmail.com', phone: '+917418345693', name: 'KAMALESH' },
    { email: 'jumailahamed2007@gmail.com', phone: '+918807549708', name: 'Jumail Nayas Ahamed' },
    { email: 'pavithkishore161@gmail.com', phone: '+919500581689', name: 'Pavith Kishore' },
    { email: 'revanth.dm271062@greatlakes.edu.in', phone: '+919444505243', name: 'Revanth T R' },
    { email: 'yessankavatap29@gmail.com', phone: '+919760074580', name: 'Yesh' },
    { email: 'atulksingh9263@gmail.com', phone: '+919263175563', name: 'Atul Kumar Singh' },
    { email: '24mb0087@iitism.ac.in', phone: '+917977937648', name: 'Yadnyesh Sanjay Nikam' },
    { email: 'sec24cj008@sairamtap.edu.in', phone: '+919345047543', name: 'Kowshik kumaar C' },
    { email: 'dharunraj7507@gmail.com', phone: '+918248195738', name: 'Dharun raj' },
    { email: 'anaprarth456@gmail.com', phone: '+916381360531', name: 'Prarthana V' },
    { email: 'aparnaab03@gmail.com', phone: '+918939738173', name: 'Aparnaa B' },
    { email: 'shamaathmika@gmail.com', phone: '+918610097870', name: 'Shamaathmika K' },
    { email: 'abh23.code@gmail.com', phone: '+919345625509', name: 'Abhijith Manoj' },
    { email: '727723eucb011@skcet.ac.in', phone: '+919342012849', name: 'Gopika Gopal' },
    { email: 'amogh.pandit26@sibm.edu.in', phone: '+917045110606', name: 'Amogh Pandit' },
    { email: 'sankunninair25@gmail.com', phone: '+919487691902', name: 'Gaurisankar D' },
    { email: 'samvjoel2006@gmail.com', phone: '+918660766269', name: 'Sam V Joel' },
    { email: 'mohithshailendira@gmail.com', phone: '+919282150656', name: 'MOHITH SHAILENDIRA S' },
    { email: 'aatiraaur@gmail.com', phone: '+917397325655', name: 'Aatiraa UR' },
    { email: 'bhavyasingam599@gmail.com', phone: '+919398710949', name: 'Singam Bhavya sree' },
    { email: 'vishnusureshg2024@gmail.com', phone: '+916374941368', name: 'Vishnu Suresh' },
    { email: 'rdganesh78@gmail.com', phone: '+918590529691', name: 'Ganesh' },
    { email: 'grace.benita1812@gmail.com', phone: '+917200234209', name: 'Benita Grace' },
    { email: '2313711043006@mopvaishnav.ac.in', phone: '+919344362901', name: 'Gomathi V' },
    { email: 'sanjana.prabhakar7@gmail.com', phone: '+917395889898', name: 'Sanjana Prabhakar' },
    { email: 'ritikaschennai@gmail.com', phone: '+919345549672', name: 'Ritika' },
    { email: 'ramyaavarsh1706@gmail.com', phone: '+916383655501', name: 'Ramyaa Varshane' },
    { email: '2513711043007@mopvaishnav.ac.in', phone: '+919150440889', name: 'Dhanya D' },
    { email: 'mushalovinim@iipmb.edu.in', phone: '+916383089572', name: 'Mushalovini M' },
    { email: 'ezhilselvan25310085@snuchennai.edu.in', phone: '+918189861620', name: 'Ezhilselvan' },
    { email: 'ishwariyanagaraj2006@gmail.com', phone: '+916380642129', name: 'Ishwariya Nagaraj' },
    { email: 'riddhi135agarwal@gmail.com', phone: '+919875022502', name: 'Riddhi Agarwal' },
    { email: 'sowmya.swarna05@gmail.com', phone: '+919840598318', name: 'Sowmya Mahadevan' },
    { email: 'onlinerakshithaa@gmail.com', phone: '+918678944050', name: 'G. P. Sai Rakshithaa' },
    { email: 'jesinvenmanijm@gmail.com', phone: '+919787929302', name: 'Jesin Venmani J M' },
    { email: '23uco331@loyolacollege.edu', phone: '+918925630900', name: 'EmilTittu' },
    { email: 'karan.chopra26@sibm.edu.in', phone: '+919560276990', name: 'Karan Chopra' },
    { email: 'shirpashivani556@gmail.com', phone: '+916369986606', name: 'SHIRPA SHIVANI' },
    { email: 'saisrinidhiramamurthy@gmail.com', phone: '+918939582592', name: 'R Saisrinidhi' },
    { email: 'srinidhisridhar20@gmail.com', phone: '+919363377391', name: 'Srinidhi Sridhar' },
    { email: 'prasanaram2007@gmail.com', phone: '+919884613289', name: 'Prasana Ram' },
    { email: 'mishrapratikshya06@gmail.com', phone: '+917305929991', name: 'Pratikshya Mishra' },
    { email: 'krishnapriyagokul9@gmail.com', phone: '+917994918609', name: 'Krishnapriya Gokul' },
    { email: 'ushallkamal143@gmail.com', phone: '+917448659186', name: 'Ushall Kamal .A' },
    { email: 'hk8050@srmist.edu.in', phone: '+919494567862', name: 'Hariharan' },
    { email: 'gayathri.200805@gmail.com', phone: '+918610239994', name: 'Gayathri A' },
    { email: '2313711043003@mopvaishnav.ac.in', phone: '+919840843451', name: 'Antara Kapoor' },
    { email: 'harshbafna0905@gmail.com', phone: '+919110275268', name: 'Harsh bafna R' },
    { email: 'bmeabhishek@gmail.com', phone: '+917569552179', name: 'BALIREDDI V V N S ABHISHEK' },
    { email: 'vibhamalathkarworks@gmail.com', phone: '+918015081253', name: 'Vibha Malathkar' },
    { email: 'tanujabernard18@gmail.com', phone: '+919345212423', name: 'B. Tanuja' },
    { email: 'giftson00000@gmail.com', phone: '+919677054627', name: 'SUJITH GIFTSON. R' },
    { email: 'karthikraja@thesnippet.app', phone: '+919047095135', name: 'Karthik Raja' },
    { email: 'nammapaya007@gmail.com', phone: '+916380384016', name: 'Abinash .S' },
    { email: 'gsnsoorya@gmail.com', phone: '+919500141536', name: 'Soorya narayanan' },
    { email: 'vaishnaviofficial.03@gmail.com', phone: '+919003035619', name: 'Vaishnavi Vasudevan' },
    { email: 'kittusoni0205@gmail.com', phone: '+919962236278', name: 'Kushboo' },
    { email: 'angel_pabby@ug29.mesaschool.co', phone: '+919872303455', name: 'Angel Pabby' },
    { email: 'shruthirana78@gmail.com', phone: '+918122921699', name: 'Shruti Rana Butt' },
    { email: 'diya.surana2305@gmail.com', phone: '+917200124238', name: 'Diya Surana' },
    { email: 'umabasker1234@gmail.com', phone: '+918825994396', name: 'Aakash' },
    { email: 'aakarshan_gupta@pg26.mesaschool.co', phone: '+917087913421', name: 'Aakarshan Gupta' },
    { email: 'indhuja2006@gmail.com', phone: '+917825844144', name: 'Indhuja I' },
    { email: 'rainabafna12@gmail.com', phone: '+919513605566', name: 'Raina Bafna' },
    { email: 'abinandha76@gmail.com', phone: '+919094782356', name: 'Abinandha V' },
    { email: 'pavanaj25310077@snuchennai.edu.in', phone: '+919345691375', name: 'Pavanaj M' },
    { email: 'dhxnush18@gmail.com', phone: '+918073031398', name: 'Dhanush S' },
    { email: '2harikaran.ramesh06@gmail.com', phone: '+919176063628', name: 'hari karan' },
    { email: '25ubc202@loyolacollege.edu', phone: '+919342945692', name: 'S Tarun' },
    { email: 'anirudh_malani@pg26.mesaschool.co', phone: '+919051522999', name: 'Anirudh Malani' },
    { email: '23uco377@loyolacollege.edu', phone: '+919962305937', name: 'SETHISWAR ISHWAR' },
    { email: 'ethanpeters.june08@gmail.com', phone: '+919840179497', name: 'Ethan peters' },
    { email: 'pranavshankar510@gmail.com', phone: '+918015916440', name: 'Pranav Shankar' },
    { email: 'mohamedirfanalibatcha@gmail.com', phone: '+918925678586', name: 'Mohamed Irfan' },
    { email: 'pracheetha05@gmail.com', phone: '+917200222025', name: 'Pracheetha TP' },
    { email: 'dharane29@gmail.com', phone: '+919790202067', name: 'Dharane' },
    { email: 'dhruvchowdhary25@gmail.com', phone: '+919840634038', name: 'Dhruv Chowdhary' },
    { email: 'saujassriram@gmail.com', phone: '+919342441795', name: 'Saujas' },
    { email: 'harshith06112005@gmail.com', phone: '+919600037777', name: 'Harshith S' },
    { email: 'magathoomsameena@gmail.com', phone: '+919345868327', name: 'Magathoom Sameena' },
    { email: 'eswarbalaji543@gmail.com', phone: '+919629590407', name: 'Eswar Balaji' },
    { email: 'akshithav2704@gmail.com', phone: '+918015127040', name: 'Akshitha Vani Anand' },
    { email: 'ashwinsubbiahpv@gmail.com', phone: '+918015159059', name: 'Ashwin Subbiah' },
    { email: 'andalkrishna2906@gmail.com', phone: '+917305972906', name: 'Deepti' },
    { email: 'shreeravindran05@gmail.com', phone: '+919342570398', name: 'Shreelakshmi R' },
    { email: 'sam.lunkked17@gmail.com', phone: '+918390128390', name: 'Samiksha lunkked' },
    { email: 'ranchanaa2025@gmail.com', phone: '+919080906434', name: 'Ranchana A' },
    { email: 'joshuapandiyan1980@gmail.com', phone: '+919551020387', name: 'JOSHUA P' },
    { email: 'aswinkaruthayam@gmail.com', phone: '+916374443185', name: 'Aswin Kumar K' },
    { email: 'aimarbaniang19@gmail.com', phone: '+919436166770', name: 'Ainame Marbaniang' },
    { email: 'gracygracy633@gmail.com', phone: '+919150132122', name: 'Gracy S' },
    { email: 'reenisrah794@gmail.com', phone: '+916381257266', name: 'Reeni Sarah C' },
    { email: '24su1530055@student.hindustanuniv.ac.in', phone: '+919840681741', name: 'A Aidh sheriff' },
    { email: 'dineshwarans-25pgdm@gibs.edu.in', phone: '+918667237089', name: 'S Dineshwaran' },
    { email: 'ishanthkumar09@gmail.com', phone: '+916380496866', name: 'Ishanth Kumar S' },
    { email: 'manokeerthu26@gmail.com', phone: '+916381718676', name: 'B. Manonmani' },
    { email: 'jayasuryamallady@gmail.com', phone: '+919345525441', name: 'JAYASURYA V MALLADY' },
    { email: '24uec205@loyolacollege.edu', phone: '+919384491479', name: 'Yohan Sumodh' },
    { email: 'sangeeta272003@gmail.com', phone: '+916369901860', name: 'S.Sangeeta' },
    { email: '231531601057@crescent.edu', phone: '+919655886803', name: 'SREERAM BHARATH J S' },
    { email: 'srinidhik1409@gmail.com', phone: '+918946076858', name: 'Srinidhi K' },
    { email: 'subi14072007@gmail.com', phone: '+919566973400', name: 'Gopika' },
    { email: 'krishnacandy345@gmail.com', phone: '+919841855525', name: 'Krishna Kowshik' },
    { email: 'skamatchidevi.12@gmail.com', phone: '+919940255151', name: 'Kamatchi Devi S' },
    { email: 'bunnyboy8632@gmail.com', phone: '+917799607075', name: 'Sri raj' },
    { email: 'khushimathur24@gmail.com', phone: '+918447427039', name: 'Khushi Mathur' },
    { email: 'kotagirishashank66@gmail.com', phone: '+919010495300', name: 'Kotagiri Shashank' },
    { email: 'sbk.kruthiga2008@gmail.com', phone: '+919003201848', name: 'KRUTHIGA SRI S B' },
    { email: 'rahul_setia@ug29.mesaschool.co', phone: '+916284684797', name: 'Rahul Setia' },
    { email: 'batra.kamya2905@gmail.com', phone: '+919384664950', name: 'Kamya Batra' },
    { email: 'prerakgupta04@gmail.com', phone: '+919518167256', name: 'Prerak Gupta' },
    { email: 'saisrinivasangb@gmail.com', phone: '+919962924802', name: 'Sai Srinivasan' },
    { email: 'arsinshane@929gmail.com', phone: '+919150345616', name: 'Arsin shane' },
    { email: 'atulvenkateswaran@gmail.com', phone: '+917010453489', name: 'Atul Venkateswaran' },
    { email: '24comc54@kristujayanti.com', phone: '+919108503850', name: 'Rohit Khadka' },
    { email: 'moaaqib23@gmail.com', phone: '+919087263878', name: 'MUHAMMED AAQIB K' },
    { email: '24comb55@kristujayanti.com', phone: '+919741906732', name: 'Ravi Siddu C' },
    { email: 'a.sergius9240@gmail.com', phone: '+917845842183', name: 'Sergius A' },
    { email: 'ch24b022@smail.iitm.ac.in', phone: '+919163689846', name: 'Swapnil Mandal' },
    { email: 'mukesh.d@mba.christuniversity.in', phone: '+918248330074', name: 'Mukesh Devan' },
    { email: '23comf32@kristujayanti.com', phone: '+919535334177', name: 'Medini Shastri' },
    { email: '23ueca011@stellamariscollege.edu.in', phone: '+918590298113', name: 'Ann Benny' },
    { email: 'archtheceo@gmail.com', phone: '+919818469922', name: 'Anjana' },
    { email: 'gopimahesh2003@gmail.com', phone: '+918248666686', name: 'Mahesh G' },
    { email: 'tharuna02032007@gmail.com', phone: '+919791138915', name: 'Laksshayahshree.R.S' },
    { email: 'jeffisarah.j@gmail.com', phone: '+919150252230', name: 'Jeffi Sarah J' },
    { email: 'ritweakin@gmail.com', phone: '+919043771119', name: 'Sanjula D' },
    { email: 'lekh_kawrath2024@cms.ac.in', phone: '+918667265745', name: 'Lekh Kawrath' },
    { email: 'f24111.neha@liba.edu', phone: '+919495889973', name: 'Neha Anna Cherian' },
    { email: 'f24084.kevin@liba.edu', phone: '+919003227897', name: 'Kevin Kumar S' },
    { email: 'rdsrinath27@gmail.com', phone: '+919884038912', name: 'Srinath' },
    { email: 'pranavknarayan29@gmail.com', phone: '+919150129333', name: 'Pranav K Narayan' },
    { email: 'hridaygupta356@gmail.com', phone: '+918144627560', name: 'Hriday Gupta' },
    { email: 'abhatera28@gmail.com', phone: '+919025812582', name: 'Aryan Bhatera' },
    { email: 'fizanaaz590@gmail.com', phone: '+918002247016', name: 'Fiza parween' },
    { email: 'kaushikakarthikeyan50@gmail.com', phone: '+917904699616', name: 'Kaushika K' },
    { email: 'sjosteve7@gmail.com', phone: '+919500190829', name: 'S Josteve' },
    { email: '24su1540018@student.hindustanuniv.ac.in', phone: '+916379113376', name: 'R.Priyan' },
    { email: 'emilttitu4@gmail.com', phone: '+917695953780', name: 'Sebatin' },
    { email: 'pranaysanthosh237@gmail.com', phone: '+918939242120', name: 'Pranay Santhosh' },
    { email: '23uco321@loyolacollege.edu', phone: '+919514783802', name: 'Gifton' },
    { email: 'nameisdivyesh@gmail.com', phone: '+919363760748', name: 'Mithun Raaj' },
    { email: '24cmh22@wcc.edu.in', phone: '+919952907977', name: 'Preethi C L' },
    { email: 'aatmajasriram@gmail.com', phone: '+919445534768', name: 'Sri Aatmaja' },
    { email: 'kavithaipriya.26@gmail.com', phone: '+919840040359', name: 'Kavithai Priya P' },
    { email: 'shainasalma15@gmail.com', phone: '+919342733871', name: 'Shaina Salma A R' },
    { email: '25cmg018@wcc.edu.in', phone: '+918248257201', name: 'Jeniliya A' },
    { email: 'monikaprabakaran11@gmail.com', phone: '+917845362110', name: 'Monika TP' },
    { email: 'dhinavmanmaadesh@gmail.com', phone: '+916381502862', name: 'P. DHIEVESH' },
    { email: 'sakinabanu1503@gmail.com', phone: '+918667270864', name: 'Sakina Banu' },
    { email: 'msanjeev2005@gmail.com', phone: '+918939554426', name: 'SANJEEV.M' },
    { email: 'loshiniroopkumar@gmail.com', phone: '+916382386845', name: 'Loshini R' },
    { email: 'chandramouliaravind05@gmail.com', phone: '+916380166870', name: 'Aravind Chandramouli' },
    { email: 'reshma200717@gmail.com', phone: '+919790778799', name: 'Reshma S' },
    { email: 'sumitmehta99400@gmail.com', phone: '+917305246324', name: 'Sankesh Pipada' },
    { email: 'm.u.7uvais777@gmail.com', phone: '+917200591276', name: 'Muhammad Uvais' },
    { email: 'venika.haridass@gmail.com', phone: '+919566031646', name: 'Disha' },
    { email: 'gantageetam2003@gmail.com', phone: '+917396426316', name: 'Ganta Geetam' },
    { email: 'saitharun541@gmail.com', phone: '+916302578212', name: 'Y Sai Tharun Reddy' },
    { email: 'abhishek.080726@gmail.com', phone: '+917639353211', name: 'Abhishek V' },
    { email: 'preethilakshmi268@gmail.com', phone: '+919962094651', name: 'Preethi Lakshmi' },
    { email: 'rameesamohasyn@gmail.com', phone: '+918714304505', name: 'Rameesa' },
    { email: '24uco032@loyolacollege.edu', phone: '+917904934447', name: 'Giridharan V' },
    { email: 'namrattha.mr@gmail.com', phone: '+918778104778', name: 'Namrattha' },
    { email: 'daydreamer2146@gmail.com', phone: '+919087574087', name: 'Shyam Sundar Jayakumar' },
    { email: 'shreyabharath007@gmail.com', phone: '+918610896192', name: 'Shreya Bharath' },
    { email: 'ratanthiraviam@gmail.com', phone: '+919025098733', name: 'Ratan Thiraviam' },
    { email: 'sarveshprabhu25@gmail.com', phone: '+919940592998', name: 'Sarvesh P' },
    { email: '231201012@rajalakshmi.edu.in', phone: '+919345176121', name: 'Jai Ganesh' },
    { email: 'talufarhan2007@gmail.com', phone: '+919003015329', name: 'Farhan' },
    { email: 'rohanvnair.2008@gmail.com', phone: '+919342743899', name: 'Rohan' },
    { email: 'nellaifaheem@gmail.com', phone: '+919363606418', name: 'Faheem' },
    { email: '24d101@amjaincollege.edu.in', phone: '+918778959373', name: 'B Deepak Paswan' },
    { email: 'catherinerosegeorge@gmail.com', phone: '+918428938924', name: 'Catherine rose george' },
    { email: 'tarangmittal2007@gmail.com', phone: '+918667815595', name: 'Tarang Mittal' },
    { email: 'srish.satya@mba.christuniversity.in', phone: '+918939692333', name: 'Srish Satya S' },
    { email: 'tanishasethiya14@gmail.com', phone: '+917845688620', name: 'Tanisha' },
    { email: 'n.manavjain@gmail.com', phone: '+919445643945', name: 'N. MANAV JAIN' },
    { email: 'priscacarmelmary.rm.2024.mba@rajalakshmi.edu.in', phone: '+918248537616', name: 'Prisa Carmel Mary RM' },
    { email: 'preethicrown14@gmail.com', phone: '+917358282033', name: 'Preethi S' },
    { email: 'sanjaysaisridharans@gmail.com', phone: '+919677016670', name: 'Sanjay Sai' },
    { email: 'rrishikeshonline@gmail.com', phone: '+917550006496', name: 'Rishikesh R' },
    { email: 'alan.paul@mba.christuniversity.in', phone: '+919061975906', name: 'Alan paul' },
    { email: 'rohinraj21@gmail.com', phone: '+919790764070', name: 'Rohin raj' },
    { email: 'sridhar.ganesh@mba.christuniversity.in', phone: '+919488492292', name: 'Sridhar Ganesh' },
    { email: 'preethi14crown@gmail.com', phone: '+917358282033', name: 'Preethi S' },
    { email: 'haseena0511@gmail.com', phone: '+919514496987', name: 'Haseena' },
    { email: 'vj015577@gmail.com', phone: '+918871567890', name: 'Vansh.R.K' },
    { email: 'bettinadenis1979@gmail.com', phone: '+917358321979', name: 'BETTINA DENIS' },
    { email: 'mesanto2003@gmail.com', phone: '+918056113116', name: 'Shyam JP' },
    { email: 'divyakarthick2608@gmail.com', phone: '+919600046275', name: 'C k Divya Darshini' },
    { email: 'jayaprakash.s.2025.mba@rajalakshmi.edu.in', phone: '+916380800258', name: 'Jayaprakash s' },
    { email: 'mokshap70@gmail.com', phone: '+919941459544', name: 'Moksha P' },
    { email: 'shreyvi18@gmail.com', phone: '+919344742737', name: 'Shreyas Vishwanath' },
    { email: '25uco173@loyolacollege.edu', phone: '+918778649412', name: 'Ramu' },
    { email: 'shritejaswinivr@gmail.com', phone: '+919498304609', name: 'SHRI TEJASWINI VR' },
    { email: 'aadhit692@gmail.com', phone: '+916369092659', name: 'Harsh' },
    { email: 'suvasganesh@gmail.com', phone: '+919384807790', name: 'Suvas Ganesh' },
    { email: 'pushkarpramanick24@gmail.com', phone: '+919841135488', name: 'Pushkar Pramanick' },
    { email: 'shankarikesavan367@gmail.com', phone: '+918870076950', name: 'SHANKARI KESAVAN' },
    { email: '251571601048@crescent.education', phone: '+918072660036', name: 'Reshmi' },
    { email: 'anjanab1810@gmail.con', phone: '+917010656005', name: 'Anjana' },
    { email: 'anshuldav05@gamil.com', phone: '+918122051870', name: 'Chinmay' },
    { email: 'thavanesh172007@gmail.com', phone: '+919043705541', name: 'Thavanesh J' },
    { email: 'haazxqqq@gmail.com', phone: '+919444805779', name: 'Mohammed Haaziq Ryan' },
    { email: 'divyakarthick2608@gmail.con', phone: '+919600046275', name: 'Divya darshini' },
    { email: 'shringesh122@gmail.com', phone: '+919150252207', name: 'Shringesh' },
    { email: 'anshuldav05@gmail.com', phone: '+919962373951', name: 'Chinmay' },
    { email: 'mailvishesh07@gmail.com', phone: '+919884907501', name: 'R Vishesh Jain' },
    { email: 'shachin0729@gmail.com', phone: '+916380423136', name: 'Shachin aditya' },
    { email: '25ust036@loyolacollege.edu', phone: '+917200150516', name: 'Havish' },
    { email: '24ueca44@stellamariscollege.edu.in', phone: '+918925966601', name: 'Keerthana Anand' },
    { email: 'swastha.shankar27@gmail.com', phone: '+917305315715', name: 'Swastha. S' },
    { email: 'rijure25@gmail.com', phone: '+919360325702', name: 'Riju R' },
    { email: 'jarinabegamaara@gamil.com', phone: '+917010984808', name: 'Aaradhilfar' },
    { email: 'shreya.dm273078@greatlakes.edu.in', phone: '+918754453679', name: 'Shreya M' },
    { email: 'pravinrajs0406@gmail.com', phone: '+918667296838', name: 'Pravin raj' },
    { email: 'aaradhilfar18@gmail.com', phone: '+919788484111', name: 'Aaradhilfar M S' },
    { email: 'shalini13.nagarajan@gmail.com', phone: '+919384666779', name: 'Shalini N' },
    { email: 'sahanamanjunath2006@gmail.com', phone: '+918072022371', name: 'Sahana Y M' },
    { email: '727723eucb005@skcet.ac.in', phone: '+918637454583', name: 'Avanthika Sekar' },
    { email: 'sathwik.hallikerimath26@sibm.edu.in', phone: '+919108892690', name: 'Sathwik V Hallikerimath' },
    { email: 'yashu.pvt721@gmail.com', phone: '+917338402459', name: 'Yashvardhan G' },
    { email: 'douglasnoel190306@gmail.com', phone: '+919884078927', name: 'Douglas noel' },
    { email: '2313711043017@mopvaishnav.ac.in', phone: '+918248669081', name: 'Priyadarshini M' },
    { email: 'smirithisridharan@gmail.com', phone: '+919176342232', name: 'Smirithi Sridharan' },
    { email: 'saikripa.sathiyanarayan@gmail.com', phone: '+919363242919', name: 'Saikripa' },
    { email: 'subavenkat1903@gmail.com', phone: '+917358047260', name: 'Subashini v' },
    { email: '2513711043041@mopvaishnav.ac.in', phone: '+918144573054', name: 'Preethi K' },
    { email: 'narishikumar55@gmail.com', phone: '+916383301070', name: 'Rishikumar' },
    { email: 'diyaouseppachan218b@gmail.com', phone: '+919447402833', name: 'Diya Ouseppachan' },
    { email: 'aroshanshabhika@gmail.com', phone: '+919940160034', name: 'ROSHAN SHABHIKA.A' },
    { email: 'jagrit.bhat26@sibm.edu.in', phone: '+919594185485', name: 'Jagrit Sai Bhat' },
    { email: 'srivarshineenat@gmail.com', phone: '+917397357961', name: 'Srivarshinee Natarajan' },
    { email: 'karthiksrinivas953@gmail.com', phone: '+918946084056', name: 'Karthik Srinivas.S' },
    { email: 'annietom1602@gmail.com', phone: '+917737789269', name: 'Annie Tom' },
    { email: 'andreanaomi2007@gmail.com', phone: '+919840086847', name: 'Andrea Naomi' },
    { email: 'aidur9366@gmail.com', phone: '+916383418156', name: 'Durai G' },
    { email: 'apranaviapranavi@gmail.com', phone: '+916380177381', name: 'Pranavi A' },
    { email: '2313711043007@mopvaishnav.ac.in', phone: '+917305075591', name: 'Harini P' },
    { email: 'ravik3048@gmail.com', phone: '+919880569609', name: 'Ravi Kumar K' },
    { email: 'arbaaz2255@gmail.com', phone: '+919790953832', name: 'Arbaaz Alizarr S' },
    { email: 'nithishkumarselvam372@gmail.com', phone: '+916383437765', name: 'Nithish kumar .S' },
    { email: 'vinothkanna.537@gmail.com', phone: '+919940200486', name: 'Vinoth kanna' },
    { email: 'aldanantonykurian@gmail.com', phone: '+918148588759', name: 'Aldan Antony' },
    { email: 'shwetha25310087@snuchennai.edu.in', phone: '+916379497802', name: 'A K Shwetha' },
    { email: '25ubc075@loyolacollege.edu', phone: '+919941822322', name: 'Darshan D Jain' },
    { email: 'yatharth_asopa@pg26.mesaschool.co', phone: '+917406469250', name: 'Yatharth Asopa' },
    { email: '23uco376 @loyolacollege.edu', phone: '+917338774426', name: 'DHEERAJ' },
    { email: 'mohammed.arhamk07@gmail.com', phone: '+917904530145', name: 'Mohammed Arham' },
    { email: '51007pratha@gmail.com', phone: '+916369313217', name: 'Prathamesh Kumar' },
    { email: 'mohamedfaheem865@gmail.com', phone: '+918220674634', name: 'Mohamed Faheem' },
    { email: 'swethakamini25@gmail.com', phone: '+917305517471', name: 'Swetha Kamini' },
    { email: 'ishitagarwal04@gmail.com', phone: '+917004625408', name: 'Ishit Agarwal' },
    { email: 'kondapallichathuryarenukareddy@gmail.com', phone: '+917200260339', name: 'Chathurya' },
    { email: 'mohamedfayas621@gmail.com', phone: '+919488519063', name: 'Mohamed Fayas' },
    { email: 'gokul.sv.professional@gmail.com', phone: '+919884300822', name: 'Gokul SV' },
    { email: 'azimashira123@gmail.com', phone: '+919444273756', name: 'Azima Shira' },
    { email: 'hardhikareddy1036@gmail.com', phone: '+919100469569', name: 'Hardhika Reddy D' },
    { email: 'mohammedshaffirudeen07@gmail.com', phone: '+919786779928', name: 'Mohammed Shaffirudeen A' },
    { email: 'kaunain.fatima010@gmail.com', phone: '+919384720661', name: 'Kaunain Fathima' },
    { email: '24su1530048@student.hindustanuniv.ac.in', phone: '+919989096975', name: 'Katakam Jahnavi' },
    { email: 'aravindanv-25pgdm@gibs.edu.in', phone: '+917550123170', name: 'Aravindan V' },
    { email: 'hitinjain07@gmail.com', phone: '+917397281947', name: 'Hitin Jain V' },
    { email: '231531601027@crescent.edu', phone: '+919150342333', name: 'Kishore kumar G' },
    { email: 'avantimurugan@gmail.com', phone: '+919884256281', name: 'Avanthika MS' },
    { email: 'bhavadharini126@gmail.com', phone: '+919884095036', name: 'T Bhavadharini' },
    { email: 'zamanulfahmanpk@gmail.com', phone: '+919787844227', name: 'Zaman Ul Fahaman' },
    { email: 'devanshbamba29@gmail.com', phone: '+919108284049', name: 'Devansh Bamba' },
    { email: 'shraddhamikkilineni2006@gmail.com', phone: '+918639963023', name: 'Mikkilineni Shraddha' },
    { email: 'nilasudhagar10@gmail.com', phone: '+918884285793', name: 'Nila varasi' },
    { email: 'sripradha3011@gmail.com', phone: '+919840155021', name: 'G L Sripradha' },
    { email: 'faazil398@gmail.com', phone: '+919701010140', name: 'Mohammad Faazil' },
    { email: 'fathintaufeeq1409@gmail.com', phone: '+916382428200', name: 'Fathin taufeeq' },
    { email: 'kmanishankar174@gmail.com', phone: '+914447716020', name: 'Manishankar K' },
    { email: '24come41@kristujayanti.com', phone: '+919606868131', name: 'Manoj M' },
    { email: 'pranavshankar1506@gmail.com', phone: '+918825815899', name: 'Pranav Shankar' },
    { email: 'sanoj.saji@mba.christuniversity.in', phone: '+919434281656', name: 'Sanoj M Saji' },
    { email: '23ocmb39@kristujayanti.com', phone: '+919380116692', name: 'Rashmi M Shetty' },
    { email: '24ucma218@stellamariscollege.edu.in', phone: '+919790780860', name: 'Prathiksha PR' },
    { email: 'sibiselvaraj2808@gmail.com', phone: '+918639142610', name: 'Sibip prasad S' },
    { email: 'rajinasagayam4718@gmail.com', phone: '+917845786819', name: 'Rajina.D' },
    { email: 'ritweakin@gmail.com', phone: '+917977041818', name: 'Catherine Jesudasan' },
    { email: 'f24123.raoul@liba.edu', phone: '+919791140152', name: 'Raoul Dreyfus' },
    { email: 'f24101.mona@liba.edu', phone: '+918072420327', name: 'Mona S' },
    { email: 'muditlunawat1@gmail.com', phone: '+917305530961', name: 'Mudit Lunawat' },
    { email: 'krishagarwal918@gmail.com', phone: '+919384623907', name: 'Krish Agarwal' },
    { email: 'dishafdo15@gmail.com', phone: '+919566031646', name: 'Disha Fernando' },
    { email: 'nandithat11@gmail.com', phone: '+919790848235', name: 'Nanditha T' },
    { email: 'ramacharana77@gmail.com', phone: '+919884024424', name: 'Ramacharana' },
    { email: '24cmh04@wcc.edu.in', phone: '+918248251239', name: 'Carol Dolly I' },
    { email: 'merlinbenny2005@gmail.com', phone: '+919061074603', name: 'Merlin Benny' },
    { email: 'rjsnehaa@gmail.com', phone: '+916385137145', name: 'RJ Snehaa' },
    { email: 'lydiathomaz23@gmail.com', phone: '+916379134562', name: 'LYDIA DEVAKUMARI' },
    { email: '251571601015@crescent.education', phone: '+919344353373', name: 'Kaviya sri' },
    { email: 'snehasri694@gmail.com', phone: '+916381532746', name: 'K Sneha Sri' },
    { email: 'mail2akshita.s@gmail.com', phone: '+918072655249', name: 'Akshita S' },
    { email: 'malini.hc2713@gmail.com', phone: '+919176019097', name: 'Devi Sesha Malini B' },
    { email: 'sumitmehta99400@gmail.com', phone: '+918760000800', name: 'Harsh Kumarpal' },
    { email: 'suryachndrkmr@gmail.com', phone: '+918610134095', name: 'Surya Chandrakumar' },
    { email: 'srajanc.09@gmail.com', phone: '+917620360745', name: 'Srajan C' },
    { email: 'saisudh2003@gmail.com', phone: '+919042584763', name: 'Sai Sudharshan B' },
    { email: 'mohanakrishnan2810@gmail.com', phone: '+919566002515', name: 'Mohana krishnan' },
    { email: 'jayashree.jane2007@gmail.com', phone: '+917810014317', name: 'Jayashree M R' },
    { email: 'ktadvait8@gmail.com', phone: '+919962609000', name: 'Advait' },
    { email: '24uco031@loyolacollege.edu', phone: '+917402142200', name: 'Muthuhariharan S' },
    { email: 'thanushri418@gmail.com', phone: '+919043537284', name: 'Thanushri.M' },
    { email: 'rajasvidevaraj@gmail.com', phone: '+917825067889', name: 'Rajasvi.D' },
    { email: 'karthick2005cr7@gmail.com', phone: '+919840862523', name: 'Karthick V' },
    { email: '231201014@rajalakshmi.edu.in', phone: '+918056019681', name: 'John Allen' },
    { email: 'bltarakeshwar.007@gmail.com', phone: '+918825603643', name: 'Tarakeshwar' },
    { email: 'shaneadrian.sno1@gmail.com', phone: '+919962244116', name: 'Shane Adrian R' },
    { email: 'exacc140@gmail.com', phone: '+918248022261', name: 'Ashwin Shrimal' },
    { email: 'ajaychacko.thomas@mba.christuniversity.in', phone: '+919400263718', name: 'Ajay Chacko Thomas' },
    { email: 'tirthjain49@gmail.com', phone: '+919840998469', name: 'Tirth' },
    { email: 'jainjainam139@gmail.com', phone: '+918122476696', name: 'JAINAM R JAIN' },
    { email: 't.ashwinsubbiah@gmail.com', phone: '+918015159059', name: 'T Ashwin Subbuah' },
    { email: 'geethapriya725@gmail.com', phone: '+917397662180', name: 'Geetha priya' },
    { email: 'yuvedigamohan@gmail.com', phone: '+919025948660', name: 'Yuvediga' },
    { email: 'kaviyaravi060608@gmail.com', phone: '+919567612381', name: 'KAVIYA R' },
    { email: 'mesanto2003@gmail.com', phone: '+919445652123', name: 'Nandha gopal' },
    { email: 'iswarya.c.2025.mba@rajalakshmi.edu.in', phone: '+916383855306', name: 'Iswarya c' },
    { email: 'sreebolt15@gmail.com', phone: '+917010166575', name: 'Sreeraj Umapathy' },
    { email: 'iamsrinethra@gmail.com', phone: '+918883988859', name: 'Sri Nethra' },
    { email: 'mithunvk216@gmail.com', phone: '+919677080327', name: 'Mithun VK' },
    { email: '25ust028@loyolacollege.edu', phone: '+918248093516', name: 'Lenin sagayam' },
    { email: 'dhruv@dyvest.org', phone: '+917358098821', name: 'Dhruv Nair' }
  ];
  // Core team - add your real core team members here if needed
  const coreTeam = [];
  const coreAllowlist = coreTeam.map(c => ({ email: c.email, phone: c.phone, name: c.name }));

  // Sample profiles removed - app will only show real registered users
  const sampleProfiles = [];

  const interests = ['Fintech', 'EdTech', 'HealthTech', 'AI/ML', 'D2C', 'SaaS', 'Marketing', 'Consulting', 'Finance', 'Crypto', 'E-commerce', 'Content'];
  const goals = ['Project Partners', 'Friends', 'Networking', 'Startup Ideas', 'Case Comp Team', 'Fest Crew', 'Career Advice', 'Just Vibing'];

  const normalizePhone = (p) => p.replace(/[\s\-\(\)]/g, '').replace(/^0+/, '');
  const normalizeEmail = (e) => e.toLowerCase().trim();
  const verifyParticipant = (email, phone) => [...allowlist, ...coreAllowlist].find(p => normalizeEmail(p.email) === normalizeEmail(email) && normalizePhone(p.phone) === normalizePhone(phone));
  const isEmailRegistered = (email) => [...allowlist, ...coreAllowlist].some(p => normalizeEmail(p.email) === normalizeEmail(email));
  const isPhoneRegistered = (phone) => [...allowlist, ...coreAllowlist].some(p => normalizePhone(p.phone) === normalizePhone(phone));
  
  // Get mutual interests count
  const getMutualInterests = (p) => {
    if (!user || !user.interests || !p.interests) return [];
    return user.interests.filter(i => p.interests.includes(i));
  };

  useEffect(() => { 
    setLoading(true);
    
    // Load profiles from Firebase (real-time listener)
    const unsubProfiles = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      const firebaseProfiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Merge with core team (core team is always present)
      const allProfiles = [...coreTeam];
      firebaseProfiles.forEach(fp => {
        if (!allProfiles.find(p => p.id === fp.id)) {
          allProfiles.push(fp);
        }
      });
      setProfiles(allProfiles.length > coreTeam.length ? allProfiles : [...coreTeam, ...sampleProfiles]);
      setLoading(false);
    }, (error) => {
      console.error('Error loading profiles:', error);
      setProfiles([...coreTeam, ...sampleProfiles]);
      setLoading(false);
    });

    // Load announcements from Firebase
    const unsubAnnouncements = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      const firebaseAnnouncements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (firebaseAnnouncements.length > 0) {
        setAnnouncements(firebaseAnnouncements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    }, (error) => console.error('Error loading announcements:', error));

    // Load feedbacks from Firebase
    const unsubFeedbacks = onSnapshot(collection(db, 'feedbacks'), (snapshot) => {
      const firebaseFeedbacks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (firebaseFeedbacks.length > 0) {
        setFeedbacks(firebaseFeedbacks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    }, (error) => console.error('Error loading feedbacks:', error));

    return () => {
      unsubProfiles();
      unsubAnnouncements();
      unsubFeedbacks();
    };
  }, []);
  
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  // Load connections, sent/received requests from Firebase when user logs in
  useEffect(() => {
    if (!user) return;
    
    // Listen for received requests
    const unsubReceived = onSnapshot(collection(db, 'users', user.id, 'receivedRequests'), (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReceivedRequests(requests);
    }, (error) => console.error('Error loading received requests:', error));

    // Listen for sent requests
    const unsubSent = onSnapshot(collection(db, 'users', user.id, 'sentRequests'), (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSentRequests(requests);
    }, (error) => console.error('Error loading sent requests:', error));

    // Listen for connections
    const unsubConnections = onSnapshot(collection(db, 'users', user.id, 'connections'), (snapshot) => {
      const conns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConnections(conns);
    }, (error) => console.error('Error loading connections:', error));

    return () => {
      unsubReceived();
      unsubSent();
      unsubConnections();
    };
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      notify('Refreshed!', 'info');
    }, 1000);
  };

  const notify = (msg, type = 'success') => setToast({ msg, type });
  
  // Firebase: Send connection request
  const sendRequest = async (p) => {
    if (!user || sentRequests.find(x => x.id === p.id) || connections.find(x => x.id === p.id)) return;
    setSentRequests([...sentRequests, p]); // Optimistic update
    notify('Request sent to ' + p.name);
    try {
      await setDoc(doc(db, 'users', user.id, 'sentRequests', p.id), { ...p, timestamp: new Date().toISOString() });
      await setDoc(doc(db, 'users', p.id, 'receivedRequests', user.id), { ...user, timestamp: new Date().toISOString() });
    } catch (e) {
      console.error('Error sending request:', e);
    }
  };

  // Firebase: Accept connection request
  const acceptRequest = async (p) => {
    if (!user) return;
    setReceivedRequests(receivedRequests.filter(x => x.id !== p.id)); // Optimistic
    setConnections([...connections, p]);
    notify('Connected with ' + p.name + '! 🎉');
    try {
      await setDoc(doc(db, 'users', user.id, 'connections', p.id), { ...p, connectedAt: new Date().toISOString() });
      await setDoc(doc(db, 'users', p.id, 'connections', user.id), { ...user, connectedAt: new Date().toISOString() });
      await deleteDoc(doc(db, 'users', user.id, 'receivedRequests', p.id)).catch(() => {});
      await deleteDoc(doc(db, 'users', p.id, 'sentRequests', user.id)).catch(() => {});
    } catch (e) {
      console.error('Error accepting:', e);
    }
  };

  // Firebase: Decline connection request
  const declineRequest = async (p) => {
    if (!user) return;
    setReceivedRequests(receivedRequests.filter(x => x.id !== p.id));
    notify('Declined', 'info');
    try {
      await deleteDoc(doc(db, 'users', user.id, 'receivedRequests', p.id));
      await deleteDoc(doc(db, 'users', p.id, 'sentRequests', user.id));
    } catch (e) {
      console.error('Error declining:', e);
    }
  };

  // Firebase: Cancel sent request
  const cancelRequest = async (p) => {
    if (!user) return;
    setSentRequests(sentRequests.filter(x => x.id !== p.id));
    notify('Cancelled', 'info');
    try {
      await deleteDoc(doc(db, 'users', user.id, 'sentRequests', p.id));
      await deleteDoc(doc(db, 'users', p.id, 'receivedRequests', user.id));
    } catch (e) {
      console.error('Error cancelling:', e);
    }
  };

  // Firebase: Flag user
  const flag = async (id, reason) => {
    setProfiles(ps => ps.map(p => p.id === id ? { ...p, flagged: true, reason } : p));
    notify('Reported', 'info');
    try {
      await updateDoc(doc(db, 'profiles', id), { flagged: true, reason });
    } catch (e) {
      console.error('Error flagging:', e);
    }
  };

  // Firebase: Remove user (admin)
  const remove = async (id) => {
    setProfiles(ps => ps.filter(p => p.id !== id));
    notify('Deleted');
    try {
      await deleteDoc(doc(db, 'profiles', id));
    } catch (e) {
      console.error('Error removing:', e);
    }
  };

  // Firebase: Unflag user (admin)
  const unflag = async (id) => {
    setProfiles(ps => ps.map(p => p.id === id ? { ...p, flagged: false, reason: null } : p));
    try {
      await updateDoc(doc(db, 'profiles', id), { flagged: false, reason: null });
    } catch (e) {
      console.error('Error unflagging:', e);
    }
  };

  // Firebase: Submit feedback
  const submitFeedback = async (fb) => {
    const feedbackData = { ...fb, id: Date.now().toString(), timestamp: new Date().toISOString() };
    setFeedbacks([feedbackData, ...feedbacks]);
    notify('Feedback submitted! 🙏');
    try {
      await setDoc(doc(db, 'feedbacks', feedbackData.id), feedbackData);
    } catch (e) {
      console.error('Error submitting feedback:', e);
    }
  };

  // Skeleton loader component
  const SkeletonCard = () => (
    <div className="card skeleton">
      <div className="card-top">
        <div className="skel-avatar"></div>
        <div className="skel-text-group">
          <div className="skel-text w70"></div>
          <div className="skel-text w50"></div>
        </div>
      </div>
      <div className="skel-text w90"></div>
      <div className="skel-tags">
        <div className="skel-tag"></div>
        <div className="skel-tag"></div>
        <div className="skel-tag"></div>
      </div>
    </div>
  );

  // Empty state component
  const EmptyState = ({ icon, title, subtitle, action, actionText }) => (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{subtitle}</p>
      {action && <button type="button" className="btn-main" onClick={action}>{actionText}</button>}
    </div>
  );

  // Pull to refresh component
  const PullToRefresh = ({ onRefresh, refreshing, children }) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
    const startY = useRef(0);
    const containerRef = useRef(null);

    const handleTouchStart = (e) => {
      if (containerRef.current?.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e) => {
      if (!isPulling) return;
      const currentY = e.touches[0].clientY;
      const diff = Math.max(0, Math.min((currentY - startY.current) * 0.5, 80));
      setPullDistance(diff);
    };

    const handleTouchEnd = () => {
      if (pullDistance > 60) {
        onRefresh();
      }
      setPullDistance(0);
      setIsPulling(false);
    };

    return (
      <div 
        ref={containerRef}
        className="ptr-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="ptr-indicator" style={{ height: pullDistance, opacity: pullDistance / 60 }}>
          {refreshing ? <span className="ptr-spinner">↻</span> : <span>↓ Pull to refresh</span>}
        </div>
        {children}
      </div>
    );
  };

  const Landing = () => (
    <div className="page">
      <nav className="nav"><div className="nav-brand">STRAT<span>E</span>GIA</div><button className="btn-ghost" onClick={() => setView('login')}>Sign In</button></nav>
      <main className="hero">
        <img src={STRATEGIA_LOGO} alt="STRATEGIA" className="hero-logo" />
        <p>Connect with business minds at Loyola College, Chennai</p>
        <button className="btn-main" onClick={() => setView('signup')}>Sign Up</button>
        <button className="btn-link" onClick={() => setView('about')}>How it works →</button>
      </main>
      <section className="features">
        <div className="feat"><span>🔒</span><b>Private</b><p>Phone shared only when mutual</p></div>
        <div className="feat"><span>✅</span><b>Verified</b><p>Registered participants only</p></div>
        <div className="feat"><span>🤝</span><b>Mutual</b><p>Both must accept to connect</p></div>
        <div className="feat"><span>⏰</span><b>Temporary</b><p>Data deleted after event</p></div>
      </section>
      <footer>
        <div className="built-by">Built by <span>Strategia Core Team</span> 💙</div>
        <p>STRATEGIA 26 • Loyola College</p>
        <div className="foot-links"><a onClick={() => setView('privacy')}>Privacy</a><a onClick={() => setView('terms')}>Terms</a><a onClick={() => setView('adminLogin')}>Admin</a></div>
      </footer>
    </div>
  );

  const Signup = () => {
    const [step, setStep] = useState(1);
    const [f, setF] = useState({ name: '', email: '', phone: '', college: '', year: '', interests: [], lookingFor: [], bio: '', linkedin: '', avatar: '👤', visible: 'all', c1: false });
    const [err, setErr] = useState({});
    const [vStatus, setVStatus] = useState('idle');
    const [vError, setVError] = useState('');

    const verify = () => {
      if (!f.email.trim() || !f.phone.trim()) { setVError('Enter both email and phone'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { setVError('Invalid email'); return; }
      if (!/^\d{10}$/.test(f.phone)) { setVError('Enter 10-digit mobile number'); return; }
      const fullPhone = '+91' + f.phone;
      setVStatus('checking'); setVError('');
      setTimeout(() => {
        const p = verifyParticipant(f.email, fullPhone);
        if (p) { setVStatus('verified'); setF(x => ({ ...x, name: p.name })); }
        else { setVStatus('failed'); const eEx = isEmailRegistered(f.email), pEx = isPhoneRegistered(fullPhone); setVError(eEx && !pEx ? 'Email found, phone doesn\'t match' : !eEx && pEx ? 'Phone found, email doesn\'t match' : 'Not in participant list'); }
      }, 800);
    };
    const next1 = () => { const e = {}; if (vStatus !== 'verified') e.v = 1; if (!f.college.trim()) e.college = 1; if (!f.year) e.year = 1; setErr(e); if (!Object.keys(e).length) setStep(2); };
    const next2 = () => { const e = {}; if (!f.interests.length) e.interests = 1; if (!f.lookingFor.length) e.lookingFor = 1; setErr(e); if (!Object.keys(e).length) setStep(3); };
    const submit = async () => { 
      if (!f.c1) { setErr({ consent: 1 }); return; } 
      if (profiles.find(p => normalizeEmail(p.email) === normalizeEmail(f.email))) { notify('Account exists!', 'info'); setView('login'); return; } 
      const u = { ...f, phone: '+91' + f.phone, id: Date.now() + '', flagged: false, verified: true, connectionCount: 0, createdAt: new Date().toISOString() }; 
      setUser(u);
      setProfiles(p => [...p, u]);
      setView('app');
      notify('Welcome to STRATEGIA Connect! 🎉');
      try {
        await setDoc(doc(db, 'profiles', u.id), u);
      } catch (e) {
        console.error('Error saving profile:', e);
      }
    };
    const tog = (k, v) => setF(x => ({ ...x, [k]: x[k].includes(v) ? x[k].filter(i => i !== v) : [...x[k], v] }));

    return (
      <div className="page auth-page">
        <button className="back" onClick={() => setView('landing')}>← Back</button>
        <div className="auth-card">
          <div className="auth-head"><div className="auth-icon">S</div><h2>Create Profile</h2><div className="steps"><span className={step >= 1 ? 'on' : ''}>1</span><span className={step >= 2 ? 'on' : ''}>2</span><span className={step >= 3 ? 'on' : ''}>3</span></div></div>
          {step === 1 && (<div className="form">
            <div className="verify-notice"><span>🎫</span><div><b>Registered Participants Only</b><p>Enter your registration details</p></div></div>
            <label className={vStatus === 'failed' ? 'err' : ''}>Email<input type="email" value={f.email} onChange={e => { setF({ ...f, email: e.target.value }); setVStatus('idle'); }} placeholder="your.email@college.edu" disabled={vStatus === 'verified'} className={vStatus === 'verified' ? 'verified' : ''} /></label>
            <label className={vStatus === 'failed' ? 'err' : ''}>Phone<div className="phone-input"><span className="phone-prefix">+91</span><input type="tel" value={f.phone} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setF({ ...f, phone: val }); setVStatus('idle'); }} placeholder="98765 43210" disabled={vStatus === 'verified'} className={vStatus === 'verified' ? 'verified' : ''} maxLength="10" /></div></label>
            {vStatus !== 'verified' && <button type="button" className="btn-verify" onClick={verify} disabled={vStatus === 'checking'}>{vStatus === 'checking' ? <span className="btn-loading">⏳</span> : '🔍 Verify'}</button>}
            {vError && <div className="error-box"><span>⚠️</span><p>{vError}</p></div>}
            {vStatus === 'verified' && (<><div className="verified-box"><span>✓</span><div><b>{f.name}</b><p>Verified participant</p></div></div><div className="divider"><span>Complete profile</span></div><label className={err.college ? 'err' : ''}>College<input value={f.college} onChange={e => setF({ ...f, college: e.target.value })} placeholder="Your institution" /></label><label className={err.year ? 'err' : ''}>Year<select value={f.year} onChange={e => setF({ ...f, year: e.target.value })}><option value="">Select</option><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option><option>MBA 1st</option><option>MBA 2nd</option><option>Alumni</option></select></label><button type="button" className="btn-main" onClick={next1}>Continue →</button></>)}
          </div>)}
          {step === 2 && (<div className="form">
            <label>Pick your avatar</label>
            <div className="avatar-inline">{avatarOptions.map(a => <button key={a} type="button" className={f.avatar === a ? 'on' : ''} onClick={() => setF({ ...f, avatar: a })}>{a}</button>)}</div>
            <label className={err.interests ? 'err' : ''}>Interests</label><div className="chips">{interests.map(i => <button key={i} type="button" className={f.interests.includes(i) ? 'on' : ''} onClick={() => tog('interests', i)}>{i}</button>)}</div>
            <label className={err.lookingFor ? 'err' : ''}>Looking For</label><div className="chips">{goals.map(i => <button key={i} type="button" className={f.lookingFor.includes(i) ? 'on' : ''} onClick={() => tog('lookingFor', i)}>{i}</button>)}</div>
            <label>Bio <small>(optional)</small><textarea value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} placeholder="Brief intro..." maxLength={120} /></label>
            <label>LinkedIn <small>(optional)</small><input value={f.linkedin} onChange={e => setF({ ...f, linkedin: e.target.value })} placeholder="linkedin.com/in/yourname" /></label>
            <div className="btn-row"><button type="button" className="btn-ghost" onClick={() => setStep(1)}>Back</button><button type="button" className="btn-main" onClick={next2}>Continue</button></div>
          </div>)}
          {step === 3 && (<div className="form">
            <div className="info-box">🔒 Phone shared only with mutual connections</div>
            <label>Visibility</label><div className="radios"><label className="radio"><input type="radio" checked={f.visible === 'all'} onChange={() => setF({ ...f, visible: 'all' })} /><span>Everyone can see my profile</span></label><label className="radio"><input type="radio" checked={f.visible === 'connections'} onChange={() => setF({ ...f, visible: 'connections' })} /><span>Only my connections</span></label></div>
            <label className={'check ' + (err.consent ? 'err' : '')}><input type="checkbox" checked={f.c1} onChange={e => setF({ ...f, c1: e.target.checked })} /><span>I consent to share my profile as per visibility settings</span></label>
            <div className="btn-row"><button type="button" className="btn-ghost" onClick={() => setStep(2)}>Back</button><button type="button" className="btn-main" onClick={submit}>Create Profile</button></div>
          </div>)}
        </div>
      </div>
    );
  };

  const Login = () => {
    const [email, setEmail] = useState(''); const [phone, setPhone] = useState(''); const [status, setStatus] = useState('idle'); const [error, setError] = useState('');
    const login = () => { 
      if (!email.trim() || !phone.trim()) { setError('Enter both fields'); return; } 
      if (!/^\d{10}$/.test(phone)) { setError('Enter 10-digit number'); return; }
      const fullPhone = '+91' + phone;
      setStatus('checking'); 
      setTimeout(() => { 
        const p = verifyParticipant(email, fullPhone); 
        if (!p) { setStatus('failed'); setError('Not found'); return; } 
        const existing = profiles.find(x => normalizeEmail(x.email) === normalizeEmail(email)); 
        if (existing) { setUser(existing); setView('app'); notify('Welcome back!'); } 
        else { setStatus('no-account'); setError('No profile yet'); } 
      }, 800); 
    };
    return (
      <div className="page auth-page">
        <button className="back" onClick={() => setView('landing')}>← Back</button>
        <div className="auth-card"><div className="auth-head"><div className="auth-icon">S</div><h2>Welcome Back</h2></div><div className="form"><label>Email<input type="email" value={email} onChange={e => { setEmail(e.target.value); setStatus('idle'); setError(''); }} placeholder="your.email@college.edu" /></label><label>Phone<div className="phone-input"><span className="phone-prefix">+91</span><input type="tel" value={phone} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setPhone(val); setStatus('idle'); setError(''); }} placeholder="98765 43210" maxLength="10" /></div></label>{error && <div className="error-box"><span>⚠️</span><p>{error}</p></div>}<button type="button" className="btn-main" onClick={login} disabled={status === 'checking'}>{status === 'checking' ? <span className="btn-loading">⏳</span> : 'Sign In'}</button>{status === 'no-account' && <button type="button" className="btn-ghost" onClick={() => setView('signup')}>Create Profile</button>}<p className="switch">New here? <a onClick={() => setView('signup')}>Create profile</a></p></div></div>
      </div>
    );
  };

  const AdminLogin = () => { const [code, setCode] = useState(''); const [err, setErr] = useState(false); return (<div className="page auth-page"><button className="back" onClick={() => setView('landing')}>← Back</button><div className="auth-card"><div className="auth-head"><div className="auth-icon admin">🛡️</div><h2>Admin</h2></div><div className="form"><label>Code<input type="password" value={code} onChange={e => { setCode(e.target.value); setErr(false); }} placeholder="Enter admin code" /></label>{err && <p className="err-text">Invalid code</p>}<button type="button" className="btn-main" onClick={() => code === ADMIN ? (setIsAdmin(true), setView('admin')) : setErr(true)}>Enter</button></div></div></div>); };

  const Admin = () => { 
    const [newAnnouncement, setNewAnnouncement] = useState('');
    const flagged = profiles.filter(p => p.flagged);
    const nonCoreProfiles = profiles.filter(p => !p.isCore);
    const list = adminTab === 'flagged' ? flagged : adminTab === 'feedback' || adminTab === 'announce' || adminTab === 'dashboard' || adminTab === 'report' ? [] : profiles; 
    
    // Dashboard stats
    const totalConnections = profiles.reduce((sum, p) => sum + (p.connectionCount || 0), 0) / 2; // Divide by 2 since connections are mutual
    const avgRating = feedbacks.length ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1) : 0;
    const topInterests = interests.map(i => ({ name: i, count: profiles.filter(p => p.interests?.includes(i)).length })).sort((a, b) => b.count - a.count).slice(0, 5);
    const collegeStats = [...new Set(profiles.map(p => p.college))].map(c => ({ name: c, count: profiles.filter(p => p.college === c).length })).sort((a, b) => b.count - a.count).slice(0, 5);
    
    const postAnnouncement = async () => {
      if (!newAnnouncement.trim()) return;
      const announcement = { id: Date.now().toString(), message: newAnnouncement.trim(), timestamp: new Date().toISOString() };
      setAnnouncements([announcement, ...announcements]);
      setNewAnnouncement('');
      notify('Announcement posted!');
      try {
        await setDoc(doc(db, 'announcements', announcement.id), announcement);
      } catch (e) {
        console.error('Error posting announcement:', e);
      }
    };
    
    const deleteAnnouncement = async (id) => {
      setAnnouncements(announcements.filter(a => a.id !== id));
      notify('Deleted', 'info');
      try {
        await deleteDoc(doc(db, 'announcements', id.toString()));
      } catch (e) {
        console.error('Error deleting announcement:', e);
      }
    };

    const generateReport = () => {
      const report = `
═══════════════════════════════════════════════════════════
           STRATEGIA CONNECT - POST-EVENT REPORT
═══════════════════════════════════════════════════════════
Generated: ${new Date().toLocaleString()}

📊 OVERVIEW
───────────────────────────────────────────────────────────
Total Participants:     ${nonCoreProfiles.length}
Core Team Members:      ${profiles.filter(p => p.isCore).length}
Total Connections Made: ${Math.round(totalConnections)}
Feedback Submissions:   ${feedbacks.length}
Average Rating:         ${avgRating}/5 ⭐
Flagged Profiles:       ${flagged.length}

📈 TOP INTERESTS
───────────────────────────────────────────────────────────
${topInterests.map((i, idx) => `${idx + 1}. ${i.name}: ${i.count} participants`).join('\n')}

🏫 COLLEGES REPRESENTED
───────────────────────────────────────────────────────────
${collegeStats.map((c, idx) => `${idx + 1}. ${c.name}: ${c.count} participants`).join('\n')}

👥 PARTICIPANT LIST
───────────────────────────────────────────────────────────
${nonCoreProfiles.map(p => `• ${p.name} | ${p.college} | ${p.email}`).join('\n')}

💬 FEEDBACK SUMMARY
───────────────────────────────────────────────────────────
${feedbacks.length ? feedbacks.map(f => `[${f.rating}⭐] ${f.userName}: "${f.message}"`).join('\n') : 'No feedback collected'}

📢 ANNOUNCEMENTS POSTED
───────────────────────────────────────────────────────────
${announcements.length ? announcements.map(a => `[${new Date(a.timestamp).toLocaleDateString()}] ${a.message}`).join('\n') : 'No announcements posted'}

═══════════════════════════════════════════════════════════
           Thank you for using STRATEGIA Connect!
              Built with 💙 by Strategia Core Team
═══════════════════════════════════════════════════════════
      `;
      
      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `strategia-connect-report-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      notify('Report downloaded!');
    };

    const exportCSV = () => {
      const headers = ['Name', 'Email', 'Phone', 'College', 'Year', 'Interests', 'Looking For', 'Bio', 'LinkedIn', 'Connections'];
      const rows = nonCoreProfiles.map(p => [
        p.name, p.email, p.phone, p.college, p.year,
        p.interests?.join('; ') || '', p.lookingFor?.join('; ') || '',
        p.bio || '', p.linkedin || '', p.connectionCount || 0
      ]);
      const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `strategia-participants-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify('CSV exported!');
    };

    const exportFeedbackCSV = () => {
      if (!feedbacks.length) {
        notify('No feedback to export', 'info');
        return;
      }
      try {
        const headers = ['Timestamp', 'Name', 'Email', 'Event', 'Overall Rating', 'Event Rating', 'Judges Rating', 'Volunteers Rating', 'Q1', 'Q1 Rating', 'Q2', 'Q2 Rating', 'Q3', 'Q3 Rating', 'Suggestions'];
        const rows = feedbacks.map(f => [
          new Date(f.timestamp).toLocaleString(),
          f.userName || '',
          f.userEmail || '',
          f.event || '',
          f.rating || '',
          f.eventRating || '',
          f.judgesRating || '',
          f.volunteersRating || '',
          f.q1 || '',
          f.q1Rating || '',
          f.q2 || '',
          f.q2Rating || '',
          f.q3 || '',
          f.q3Rating || '',
          f.improvement || ''
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `strategia-feedback-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        notify('Feedback exported!');
      } catch (e) {
        console.error('Export error:', e);
        notify('Export failed', 'info');
      }
    };
    
    return (
      <div className="page app-page admin">
        <nav className="app-nav"><div className="logo sm">🛡️ Admin</div><button className="btn-ghost sm" onClick={() => { setIsAdmin(false); setView('landing'); }}>Exit</button></nav>
        <main className="app-main">
          <div className="tabs">
            <button type="button" className={adminTab === 'dashboard' ? 'on' : ''} onClick={() => setAdminTab('dashboard')}>📊</button>
            <button type="button" className={adminTab === 'all' ? 'on' : ''} onClick={() => setAdminTab('all')}>👥</button>
            <button type="button" className={adminTab === 'announce' ? 'on' : ''} onClick={() => setAdminTab('announce')}>📢</button>
            <button type="button" className={adminTab === 'feedback' ? 'on' : ''} onClick={() => setAdminTab('feedback')}>💬</button>
            <button type="button" className={adminTab === 'report' ? 'on' : ''} onClick={() => setAdminTab('report')}>📄</button>
          </div>

          {adminTab === 'dashboard' && (
            <div className="dashboard">
              <h3>📊 Real-time Dashboard</h3>
              <div className="dash-stats">
                <div className="dash-stat big">
                  <span className="dash-icon">👥</span>
                  <b>{nonCoreProfiles.length}</b>
                  <span>Participants</span>
                </div>
                <div className="dash-stat big">
                  <span className="dash-icon">🤝</span>
                  <b>{Math.round(totalConnections)}</b>
                  <span>Connections</span>
                </div>
                <div className="dash-stat">
                  <span className="dash-icon">⭐</span>
                  <b>{avgRating}</b>
                  <span>Avg Rating</span>
                </div>
                <div className="dash-stat">
                  <span className="dash-icon">💬</span>
                  <b>{feedbacks.length}</b>
                  <span>Feedback</span>
                </div>
              </div>
              
              <div className="dash-section">
                <h4>🔥 Top Interests</h4>
                <div className="dash-bars">
                  {topInterests.map(i => (
                    <div key={i.name} className="dash-bar">
                      <span className="bar-label">{i.name}</span>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${(i.count / profiles.length) * 100}%` }}></div>
                      </div>
                      <span className="bar-count">{i.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dash-section">
                <h4>🏫 Top Colleges</h4>
                <div className="dash-bars">
                  {collegeStats.map(c => (
                    <div key={c.name} className="dash-bar">
                      <span className="bar-label">{c.name}</span>
                      <div className="bar-track">
                        <div className="bar-fill college" style={{ width: `${(c.count / profiles.length) * 100}%` }}></div>
                      </div>
                      <span className="bar-count">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dash-section">
                <h4>📈 Activity</h4>
                <div className="activity-list">
                  <div className="activity-item">
                    <span>📢</span>
                    <p>{announcements.length} announcements posted</p>
                  </div>
                  <div className="activity-item">
                    <span>🚨</span>
                    <p>{flagged.length} profiles flagged</p>
                  </div>
                  <div className="activity-item">
                    <span>⭐</span>
                    <p>{profiles.filter(p => p.isCore).length} core team members</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {adminTab === 'announce' && (
            <div className="announce-section">
              <div className="announce-form">
                <textarea value={newAnnouncement} onChange={e => setNewAnnouncement(e.target.value)} placeholder="Write an announcement..." maxLength={280} />
                <button type="button" className="btn-main" onClick={postAnnouncement} disabled={!newAnnouncement.trim()}>📢 Post Announcement</button>
              </div>
              <h4>Posted Announcements</h4>
              {announcements.length ? announcements.map(a => (
                <div key={a.id} className="announce-item">
                  <p>{a.message}</p>
                  <div className="announce-meta">
                    <span>{new Date(a.timestamp).toLocaleString()}</span>
                    <button type="button" onClick={() => deleteAnnouncement(a.id)}>🗑️</button>
                  </div>
                </div>
              )) : <EmptyState icon="📢" title="No announcements" subtitle="Post updates for all participants" />}
            </div>
          )}
          
          {adminTab === 'feedback' && (
            <div className="feedback-section">
              <div className="feedback-header">
                <h3>💬 Feedback ({feedbacks.length})</h3>
                <button type="button" className="btn-ghost sm" onClick={exportFeedbackCSV} disabled={!feedbacks.length}>📥 Export Excel</button>
              </div>
              <div className="feedback-list">{feedbacks.length ? feedbacks.map(fb => (
              <div key={fb.id} className="feedback-item">
                <div className="fb-header"><b>{fb.userName}</b><span className="fb-event-tag">{fb.event}</span></div>
                <div className="fb-ratings">
                  <div className="fb-rating-item"><span>Event</span><b>{fb.eventRating}/5</b></div>
                  <div className="fb-rating-item"><span>Judges</span><b>{fb.judgesRating}/5</b></div>
                  <div className="fb-rating-item"><span>Volunteers</span><b>{fb.volunteersRating}/5</b></div>
                </div>
                <div className="fb-specific">
                  <div className="fb-q"><span>{fb.q1}</span><b>{fb.q1Rating}/5 ⭐</b></div>
                  <div className="fb-q"><span>{fb.q2}</span><b>{fb.q2Rating}/5 ⭐</b></div>
                  <div className="fb-q"><span>{fb.q3}</span><b>{fb.q3Rating}/5 ⭐</b></div>
                </div>
                {fb.improvement && <p className="fb-text">💡 {fb.improvement}</p>}
                <span className="fb-time">{new Date(fb.timestamp).toLocaleDateString()}</span>
              </div>
            )) : <EmptyState icon="💬" title="No feedback yet" subtitle="Feedback from participants will appear here" />}</div>
            </div>
          )}

          {adminTab === 'report' && (
            <div className="report-section">
              <div className="report-card">
                <span>📄</span>
                <h4>Post-Event Report</h4>
                <p>Download a comprehensive report with all event statistics, participant data, and feedback.</p>
                <button type="button" className="btn-main" onClick={generateReport}>📥 Download Report (.txt)</button>
              </div>
              <div className="report-card">
                <span>📊</span>
                <h4>Export Participant Data</h4>
                <p>Export all participant profiles as a CSV file for further analysis.</p>
                <button type="button" className="btn-main" onClick={exportCSV}>📥 Export CSV</button>
              </div>
              <div className="report-preview">
                <h4>Report Preview</h4>
                <div className="preview-stats">
                  <div><b>{nonCoreProfiles.length}</b> Participants</div>
                  <div><b>{Math.round(totalConnections)}</b> Connections</div>
                  <div><b>{feedbacks.length}</b> Feedback</div>
                  <div><b>{avgRating}/5</b> Rating</div>
                </div>
              </div>
            </div>
          )}
          
          {(adminTab === 'all' || adminTab === 'flagged') && (
            <div className="admin-list">{list.length ? list.map(p => (
              <div key={p.id} className={'admin-item ' + (p.flagged ? 'flagged' : '')}>
                <span className="av sm">{p.avatar}</span>
                <div className="info"><b>{p.name}</b><span>{p.email}</span><span className="phone">📱 {p.phone}</span></div>
                <div className="acts">
                  {p.flagged && <button type="button" className="sm-btn green" onClick={() => unflag(p.id)}>✓</button>}
                  <button type="button" className="sm-btn red" onClick={() => window.confirm('Delete?') && remove(p.id)}>🗑️</button>
                </div>
              </div>
            )) : <EmptyState icon="👥" title="No profiles" subtitle={adminTab === 'flagged' ? 'No flagged profiles' : 'No profiles yet'} />}</div>
          )}
        </main>
      </div>
    ); 
  };

  const FeedbackForm = ({ user, onSubmit, feedbacks }) => {
    const [open, setOpen] = useState(false);
    const [event, setEvent] = useState('');
    const [eventRating, setEventRating] = useState(0);
    const [judgesRating, setJudgesRating] = useState(0);
    const [volunteersRating, setVolunteersRating] = useState(0);
    const [q1Rating, setQ1Rating] = useState(0);
    const [q2Rating, setQ2Rating] = useState(0);
    const [q3Rating, setQ3Rating] = useState(0);
    const [improvement, setImprovement] = useState('');
    
    // Check if user already submitted feedback
    const alreadySubmitted = feedbacks.some(f => f.userEmail === user?.email);

    const events = ['StrategIQ', 'Market Masters', 'VentureX', 'Case Quest'];
    
    // Event-specific questions
    const eventQuestions = {
      'StrategIQ': {
        desc: 'The Ultimate Business & Finance Quiz',
        q1: 'Were the questions challenging yet fair?',
        q2: 'Was the time per question appropriate?',
        q3: 'How was the quiz interface/buzzer system?'
      },
      'Market Masters': {
        desc: 'Live Trading & Portfolio Strategy',
        q1: 'How intuitive was the trading terminal?',
        q2: 'Was the market simulation realistic?',
        q3: 'Were the portfolio presentation guidelines clear?'
      },
      'VentureX': {
        desc: 'Shark Tank Style Pitching',
        q1: 'Was the pitching time sufficient?',
        q2: 'How helpful was the judges\' feedback?',
        q3: 'Were the evaluation criteria clear?'
      },
      'Case Quest': {
        desc: 'Case Study Competition',
        q1: 'Was the case study appropriately complex?',
        q2: 'Was the preparation time adequate?',
        q3: 'Were the presentation guidelines clear?'
      }
    };

    const currentQuestions = event ? eventQuestions[event] : null;

    const handleSubmit = () => {
      if (!event || !eventRating || !judgesRating || !volunteersRating || !q1Rating || !q2Rating || !q3Rating) return;
      onSubmit({ 
        userName: user.name, 
        userEmail: user.email, 
        event,
        eventRating, 
        judgesRating, 
        volunteersRating,
        q1: currentQuestions.q1,
        q1Rating,
        q2: currentQuestions.q2,
        q2Rating,
        q3: currentQuestions.q3,
        q3Rating,
        improvement: improvement.trim(),
        rating: Math.round((eventRating + judgesRating + volunteersRating + q1Rating + q2Rating + q3Rating) / 6)
      });
      setOpen(false);
    };

    const resetEventQuestions = () => {
      setQ1Rating(0);
      setQ2Rating(0);
      setQ3Rating(0);
    };

    // Show submitted state if user already gave feedback
    if (alreadySubmitted) return (<div className="feedback-card submitted"><span>✓</span><p>Thanks for your feedback!</p></div>);

    return (
      <div className="feedback-card">
        <div className="fb-toggle" onClick={() => setOpen(!open)}><div><span>💬</span><b>Event Feedback</b><p>Help us improve STRATEGIA</p></div><span className="arrow">{open ? '▲' : '▼'}</span></div>
        {open && (<div className="fb-form">
          <label>Which event did you participate in? <span className="required">*</span></label>
          <div className="fb-events">
            {events.map(e => (
              <button key={e} type="button" className={event === e ? 'on' : ''} onClick={() => { setEvent(e); resetEventQuestions(); }}>
                <b>{e}</b>
                <span>{eventQuestions[e].desc}</span>
              </button>
            ))}
          </div>
          
          {event && (<>
            <div className="fb-divider"><span>{event} Feedback</span></div>
            
            <label>Rate the overall event <span className="required">*</span></label>
            <div className="rating-stars">{[1,2,3,4,5].map(n => (<button key={n} type="button" className={eventRating >= n ? 'on' : ''} onClick={() => setEventRating(n)}>★</button>))}</div>
            
            <label>Rate the Judges <span className="required">*</span></label>
            <div className="rating-stars">{[1,2,3,4,5].map(n => (<button key={n} type="button" className={judgesRating >= n ? 'on' : ''} onClick={() => setJudgesRating(n)}>★</button>))}</div>
            
            <label>Rate the Volunteers <span className="required">*</span></label>
            <div className="rating-stars">{[1,2,3,4,5].map(n => (<button key={n} type="button" className={volunteersRating >= n ? 'on' : ''} onClick={() => setVolunteersRating(n)}>★</button>))}</div>
            
            <div className="fb-divider"><span>Event-Specific</span></div>
            
            <label>{currentQuestions.q1} <span className="required">*</span></label>
            <div className="rating-stars">{[1,2,3,4,5].map(n => (<button key={n} type="button" className={q1Rating >= n ? 'on' : ''} onClick={() => setQ1Rating(n)}>★</button>))}</div>
            
            <label>{currentQuestions.q2} <span className="required">*</span></label>
            <div className="rating-stars">{[1,2,3,4,5].map(n => (<button key={n} type="button" className={q2Rating >= n ? 'on' : ''} onClick={() => setQ2Rating(n)}>★</button>))}</div>
            
            <label>{currentQuestions.q3} <span className="required">*</span></label>
            <div className="rating-stars">{[1,2,3,4,5].map(n => (<button key={n} type="button" className={q3Rating >= n ? 'on' : ''} onClick={() => setQ3Rating(n)}>★</button>))}</div>
            
            <label>What could we have done better? <small>(optional)</small><textarea value={improvement} onChange={e => setImprovement(e.target.value)} placeholder="Your suggestions help us improve next year..." maxLength={500} /></label>
            
            <button type="button" className="btn-main" onClick={handleSubmit} disabled={!event || !eventRating || !judgesRating || !volunteersRating || !q1Rating || !q2Rating || !q3Rating}>Submit Feedback</button>
          </>)}
        </div>)}
      </div>
    );
  };

  const App = () => {
    const tab = appTab;
    const setTab = setAppTab;
    const listEndRef = useRef(null);
    
    // Memoized filtered results - only recalculates when dependencies change
    const filtered = useMemo(() => {
      return profiles.filter(p => { 
        if (p.id === user?.id || p.flagged) return false; 
        if (filter === 'core') return p.isCore; 
        if (filter === 'mutual') return getMutualInterests(p).length > 0;
        if (filter && !p.interests.includes(filter)) return false; 
        if (debouncedSearch) { 
          const s = debouncedSearch.toLowerCase(); 
          return p.name.toLowerCase().includes(s) || p.college.toLowerCase().includes(s) || p.interests.some(i => i.toLowerCase().includes(s)); 
        } 
        return true; 
      });
    }, [profiles, user?.id, filter, debouncedSearch]);
    
    // Paginated results - show only visibleCount items
    const paginatedResults = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
    const hasMore = filtered.length > visibleCount;
    
    // Load more function
    const loadMore = useCallback(() => {
      setVisibleCount(prev => Math.min(prev + 20, filtered.length));
    }, [filtered.length]);
    
    // Reset pagination when filter/search changes
    useEffect(() => {
      setVisibleCount(20);
    }, [filter, debouncedSearch]);
    
    // Memoized helper functions
    const isConnected = useCallback((id) => connections.some(c => c.id === id), [connections]);
    const isPending = useCallback((id) => sentRequests.some(r => r.id === id), [sentRequests]);
    const hasRequest = useCallback((id) => receivedRequests.some(r => r.id === id), [receivedRequests]);

    const handleLogout = () => {
      setUser(null);
      setView('landing');
      // Clear only session data, keep feedbacks and announcements for admin
      try {
        localStorage.removeItem('strategia_user');
        localStorage.removeItem('strategia_view');
        localStorage.removeItem('strategia_connections');
        localStorage.removeItem('strategia_sentRequests');
        localStorage.removeItem('strategia_receivedRequests');
      } catch (e) {}
    };

    return (
      <div className="page app-page">
        <nav className="app-nav"><div className="nav-brand sm">STRAT<span>E</span>GIA</div><button className="btn-ghost sm" onClick={handleLogout}>Exit</button></nav>
        <div className="tab-bar">
          <button type="button" className={tab === 'discover' ? 'on' : ''} onClick={() => setTab('discover')}><span>🔍</span>Discover</button>
          <button type="button" className={tab === 'requests' ? 'on' : ''} onClick={() => setTab('requests')}><span>📨</span>Requests{receivedRequests.length > 0 && <b>{receivedRequests.length}</b>}</button>
          <button type="button" className={tab === 'connections' ? 'on' : ''} onClick={() => setTab('connections')}><span>👥</span>Connected{connections.length > 0 && <b>{connections.length}</b>}</button>
          <button type="button" className={tab === 'profile' ? 'on' : ''} onClick={() => setTab('profile')}><span>👤</span>Profile</button>
        </div>
        <main className="app-main">
          {announcements.length > 0 && (
            <div className="announcement-banner">
              <span>📢</span>
              <p>{announcements[0].message}</p>
            </div>
          )}
          {tab === 'discover' && (
            <PullToRefresh onRefresh={handleRefresh} refreshing={refreshing}>
              <div className="search-bar"><span>🔍</span><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, college, interest..." /></div>
              <button type="button" className="core-team-btn" onClick={() => setFilter('core')}>
                <span>⭐</span>
                <div>
                  <b>Connect with Core Team</b>
                  <p>Meet the organizers of STRATEGIA'26</p>
                </div>
                <span className="arrow">→</span>
              </button>
              <div className="filter-bar"><div className="filter-scroll"><button type="button" className={filter === 'mutual' ? 'on mutual' : 'mutual'} onClick={() => setFilter(filter === 'mutual' ? '' : 'mutual')}>✨ Mutual Interests</button><button type="button" className={filter === 'core' ? 'on core' : 'core'} onClick={() => setFilter(filter === 'core' ? '' : 'core')}>⭐ Core Team</button>{interests.slice(0, 6).map(i => <button key={i} type="button" className={filter === i ? 'on' : ''} onClick={() => setFilter(filter === i ? '' : i)}>{i}</button>)}</div></div>
              {debouncedSearch !== search && <div className="search-loading">Searching...</div>}
              <div className="results-count">{filtered.length} participant{filtered.length !== 1 ? 's' : ''} found</div>
              <div className="cards">
                {loading ? (
                  <>{[1,2,3].map(i => <SkeletonCard key={i} />)}</>
                ) : paginatedResults.length ? (<>
                  {paginatedResults.map(p => {
                  const mutual = getMutualInterests(p);
                  return (
                    <div key={p.id} className="card" onClick={() => setModal(p)}>
                      <div className="card-top">
                        <span className="av">{p.avatar}</span>
                        <div>
                          <b>{p.name} {p.isCore && <span className="core-badge">⭐</span>}</b>
                          <span>{p.college} • {p.isCore ? p.role : p.year}</span>
                          {p.connectionCount > 0 && <span className="conn-count">👥 {p.connectionCount} connections</span>}
                        </div>
                      </div>
                      {mutual.length > 0 && <div className="mutual-badge">✨ {mutual.length} mutual interest{mutual.length > 1 ? 's' : ''}</div>}
                      {p.bio && <p className="bio">{p.bio}</p>}
                      <div className="tags">{p.interests.slice(0, 3).map(i => <span key={i} className={user?.interests?.includes(i) ? 'mutual' : ''}>{i}</span>)}</div>
                      <div className="card-bot">
                        {isConnected(p.id) ? <span className="status-badge connected">✓ Connected</span> : 
                         isPending(p.id) ? <span className="status-badge pending">⏳ Pending</span> : 
                         hasRequest(p.id) ? <button type="button" className="btn-accept" onClick={e => { e.stopPropagation(); acceptRequest(p); }}>Accept</button> : 
                         <button type="button" className="btn-connect" onClick={e => { e.stopPropagation(); sendRequest(p); }}>Connect</button>}
                      </div>
                    </div>
                  );
                })}
                {hasMore && (
                  <button type="button" className="load-more-btn" onClick={loadMore}>
                    Load More ({filtered.length - visibleCount} remaining)
                  </button>
                )}
                </>) : (
                  <EmptyState 
                    icon={search || filter ? "🔍" : "👥"} 
                    title={search || filter ? "No matches found" : "No profiles yet"} 
                    subtitle={search || filter ? "Try different search terms or filters" : "Be the first to join!"} 
                    action={search || filter ? () => { setSearch(''); setFilter(''); } : null}
                    actionText="Clear filters"
                  />
                )}
              </div>
            </PullToRefresh>
          )}
          {tab === 'requests' && (
            <div className="requests-section">
              <h3>Received ({receivedRequests.length})</h3>
              {receivedRequests.length ? receivedRequests.map(p => (
                <div key={p.id} className="req-item">
                  <span className="av sm" onClick={() => setModal(p)} style={{cursor:'pointer'}}>{p.avatar}</span>
                  <div className="info" onClick={() => setModal(p)} style={{cursor:'pointer'}}><b>{p.name}</b><span>{p.college}</span></div>
                  <div className="req-actions">
                    <button type="button" className="btn-sm accept" onClick={() => acceptRequest(p)}>✓</button>
                    <button type="button" className="btn-sm decline" onClick={() => declineRequest(p)}>✕</button>
                  </div>
                </div>
              )) : <EmptyState icon="📭" title="No pending requests" subtitle="When someone wants to connect, you'll see them here" />}
              <h3>Sent ({sentRequests.length})</h3>
              {sentRequests.length ? sentRequests.map(p => (
                <div key={p.id} className="req-item">
                  <span className="av sm" onClick={() => setModal(p)} style={{cursor:'pointer'}}>{p.avatar}</span>
                  <div className="info" onClick={() => setModal(p)} style={{cursor:'pointer'}}><b>{p.name}</b><span>{p.college}</span></div>
                  <button type="button" className="btn-sm cancel" onClick={() => cancelRequest(p)}>Cancel</button>
                </div>
              )) : <EmptyState icon="📤" title="No sent requests" subtitle="Send connection requests from Discover" action={() => setTab('discover')} actionText="Discover People" />}
            </div>
          )}
          {tab === 'connections' && (
            <div className="cards">
              {connections.length ? connections.map(p => (
                <div key={p.id} className="card" onClick={() => setModal(p)}>
                  <div className="card-top"><span className="av">{p.avatar}</span><div><b>{p.name}</b><span>{p.college}</span></div></div>
                  <div className="contact-box">
                    <span>📱 {p.phone}</span>
                    <div className="contact-links">
                      <a href={`https://wa.me/${p.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="wa-btn">💬 WhatsApp</a>
                      {p.linkedin && <a href={p.linkedin} target="_blank" rel="noreferrer">🔗 LinkedIn</a>}
                    </div>
                  </div>
                </div>
              )) : <EmptyState icon="🤝" title="No connections yet" subtitle="Connect with participants to see their contact info" action={() => setTab('discover')} actionText="Discover People" />}
            </div>
          )}
          {tab === 'profile' && user && (
            <div className="profile-section">
              <div className="profile-card">
                <span className="av lg">{user.avatar}</span>
                <h2>{user.name}</h2>
                <p>{user.college} • {user.year}</p>
                <p className="contact-info">📱 {user.phone}</p>
                <p className="contact-info">✉️ {user.email}</p>
                {user.linkedin && <a className="linkedin-link" href={user.linkedin} target="_blank" rel="noreferrer">🔗 LinkedIn Profile</a>}
                <div className="stats-row">
                  <div className="mini-stat"><b>{connections.length}</b><span>Connections</span></div>
                  <div className="mini-stat"><b>{sentRequests.length}</b><span>Pending</span></div>
                </div>
                {user.bio && <p className="bio">{user.bio}</p>}
                <div className="tags">{user.interests.map(i => <span key={i}>{i}</span>)}</div>
                <button type="button" className="btn-qr" onClick={() => setShowQR(true)}>📱 Share Profile (QR Code)</button>
              </div>
              <FeedbackForm user={user} onSubmit={submitFeedback} feedbacks={feedbacks} />
              <div className="settings"><h4>Settings</h4><label>Visibility<select value={user.visible} onChange={e => setUser({ ...user, visible: e.target.value })}><option value="all">Everyone</option><option value="connections">Connections only</option></select></label></div>
              <div className="danger"><h4>⚠️ Delete Profile</h4><button type="button" className="btn-danger" onClick={() => window.confirm('Delete profile?') && (setUser(null), setView('landing'))}>Delete</button></div>
            </div>
          )}
        </main>
        {modal && (
          <div className="modal-bg" onClick={() => setModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <button type="button" className="close" onClick={() => setModal(null)}>✕</button>
              <div className="modal-top">
                <span className="av lg">{modal.avatar}</span>
                <h2>{modal.name} {modal.isCore && <span className="core-badge">⭐ Core</span>}</h2>
                <p>{modal.college} • {modal.isCore ? modal.role : modal.year}</p>
                {modal.connectionCount > 0 && <span className="modal-conn-count">👥 {modal.connectionCount} connections</span>}
              </div>
              {getMutualInterests(modal).length > 0 && (
                <div className="modal-mutual">
                  <span>✨</span>
                  <p>You share {getMutualInterests(modal).length} interest{getMutualInterests(modal).length > 1 ? 's' : ''}: {getMutualInterests(modal).join(', ')}</p>
                </div>
              )}
              {modal.bio && <div className="modal-sec"><h4>About</h4><p>{modal.bio}</p></div>}
              <div className="modal-sec"><h4>Interests</h4><div className="tags">{modal.interests.map(i => <span key={i} className={user?.interests?.includes(i) ? 'mutual' : ''}>{i}</span>)}</div></div>
              <div className="modal-sec"><h4>Looking For</h4><div className="tags">{modal.lookingFor.map(i => <span key={i}>{i}</span>)}</div></div>
              {isConnected(modal.id) && (<div className="modal-sec contact"><h4>Contact</h4><p>📱 {modal.phone}</p><div className="contact-links"><a href={`https://wa.me/${modal.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="wa-btn">💬 WhatsApp</a>{modal.linkedin && <a href={modal.linkedin} target="_blank" rel="noreferrer">🔗 LinkedIn</a>}</div></div>)}
              <div className="modal-bot">
                {isConnected(modal.id) ? <span className="connected-badge">✓ Connected</span> : 
                 isPending(modal.id) ? <span className="pending-badge">⏳ Request Sent</span> : 
                 hasRequest(modal.id) ? (<div className="modal-actions"><button type="button" className="btn-main" onClick={() => { acceptRequest(modal); setModal(null); }}>Accept Request</button><button type="button" className="btn-ghost" onClick={() => { declineRequest(modal); setModal(null); }}>Decline</button></div>) : 
                 <button type="button" className="btn-main" onClick={() => { sendRequest(modal); setModal(null); }}>Send Request</button>}
                <button type="button" className="btn-report" onClick={() => { setReport(modal); setModal(null); }}>🚩 Report</button>
              </div>
            </div>
          </div>
        )}
        {report && (<div className="modal-bg" onClick={() => setReport(null)}><div className="modal sm" onClick={e => e.stopPropagation()}><button type="button" className="close" onClick={() => setReport(null)}>✕</button><h2>Report {report.name}</h2><select id="reason"><option value="">Select reason</option><option>Inappropriate</option><option>Spam/Fake</option><option>Harassment</option><option>Other</option></select><div className="modal-bot"><button type="button" className="btn-ghost" onClick={() => setReport(null)}>Cancel</button><button type="button" className="btn-danger" onClick={() => { const r = document.getElementById('reason').value; if (r) { flag(report.id, r); setReport(null); } }}>Submit</button></div></div></div>)}
        {showQR && user && (
          <div className="modal-bg" onClick={() => setShowQR(false)}>
            <div className="modal qr-modal" onClick={e => e.stopPropagation()}>
              <button type="button" className="close" onClick={() => setShowQR(false)}>✕</button>
              <div className="qr-content">
                <h2>Share Your Profile</h2>
                <p>Let others scan to connect with you</p>
                <div className="qr-code">
                  <svg viewBox="0 0 200 200" className="qr-svg">
                    {/* QR Code Pattern - Simplified visual representation */}
                    <rect x="20" y="20" width="50" height="50" fill="#fff"/>
                    <rect x="25" y="25" width="40" height="40" fill="#000"/>
                    <rect x="30" y="30" width="30" height="30" fill="#fff"/>
                    <rect x="35" y="35" width="20" height="20" fill="#000"/>
                    <rect x="130" y="20" width="50" height="50" fill="#fff"/>
                    <rect x="135" y="25" width="40" height="40" fill="#000"/>
                    <rect x="140" y="30" width="30" height="30" fill="#fff"/>
                    <rect x="145" y="35" width="20" height="20" fill="#000"/>
                    <rect x="20" y="130" width="50" height="50" fill="#fff"/>
                    <rect x="25" y="135" width="40" height="40" fill="#000"/>
                    <rect x="30" y="140" width="30" height="30" fill="#fff"/>
                    <rect x="35" y="145" width="20" height="20" fill="#000"/>
                    {/* Data pattern */}
                    <rect x="80" y="20" width="10" height="10" fill="#000"/>
                    <rect x="95" y="20" width="10" height="10" fill="#000"/>
                    <rect x="110" y="20" width="10" height="10" fill="#000"/>
                    <rect x="80" y="35" width="10" height="10" fill="#000"/>
                    <rect x="110" y="35" width="10" height="10" fill="#000"/>
                    <rect x="80" y="80" width="40" height="40" fill="#000"/>
                    <rect x="85" y="85" width="30" height="30" fill="#fff"/>
                    <rect x="90" y="90" width="20" height="20" fill="#000"/>
                    <rect x="20" y="80" width="10" height="10" fill="#000"/>
                    <rect x="35" y="80" width="10" height="10" fill="#000"/>
                    <rect x="50" y="80" width="10" height="10" fill="#000"/>
                    <rect x="130" y="80" width="10" height="10" fill="#000"/>
                    <rect x="150" y="80" width="10" height="10" fill="#000"/>
                    <rect x="170" y="80" width="10" height="10" fill="#000"/>
                    <rect x="80" y="130" width="10" height="10" fill="#000"/>
                    <rect x="95" y="145" width="10" height="10" fill="#000"/>
                    <rect x="110" y="130" width="10" height="10" fill="#000"/>
                    <rect x="130" y="130" width="10" height="10" fill="#000"/>
                    <rect x="150" y="150" width="10" height="10" fill="#000"/>
                    <rect x="170" y="170" width="10" height="10" fill="#000"/>
                  </svg>
                </div>
                <div className="qr-profile">
                  <span className="av">{user.avatar}</span>
                  <div>
                    <b>{user.name}</b>
                    <span>{user.college}</span>
                  </div>
                </div>
                <p className="qr-hint">In production, this will be a real scannable QR code linked to your profile</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const Privacy = () => (<div className="page static"><button className="back" onClick={() => setView('landing')}>← Back</button><div className="static-card"><h1>Privacy Policy</h1><section><h3>Data</h3><p>Name, email, phone, college, interests, LinkedIn. Phone only shared with mutual connections.</p></section><section><h3>Verification</h3><p>Only pre-registered participants can create accounts.</p></section><section><h3>Retention</h3><p>All data deleted 7 days after STRATEGIA 26.</p></section></div></div>);
  const Terms = () => (<div className="page static"><button className="back" onClick={() => setView('landing')}>← Back</button><div className="static-card"><h1>Terms</h1><section><h3>Eligibility</h3><p>Registered STRATEGIA 26 participants only.</p></section><section><h3>Conduct</h3><p>Be respectful. No inappropriate content.</p></section><section><h3>Connections</h3><p>Both parties must accept to connect and share contact info.</p></section></div></div>);
  const About = () => (<div className="page static"><button className="back" onClick={() => setView('landing')}>← Back</button><div className="static-card"><h1>How It Works</h1><div className="how"><div><b>1</b><h4>Verify</h4><p>Use registered email + phone</p></div><div><b>2</b><h4>Create</h4><p>Build your profile</p></div><div><b>3</b><h4>Request</h4><p>Send connection requests</p></div><div><b>4</b><h4>Connect</h4><p>Both accept = phone revealed</p></div></div><button type="button" className="btn-main" onClick={() => setView('signup')}>Sign Up</button></div></div>);
  const Toast = () => toast && <div className={'toast ' + toast.type}>{toast.type === 'info' ? 'ℹ️' : '✓'} {toast.msg}</div>;

  const css = `.nav-brand{font-weight:800;font-size:1.4rem;letter-spacing:0.5px;color:#fff}.nav-brand span{color:#e63946}.nav-brand.sm{font-size:1.2rem}.nav-logo{height:40px;width:auto;object-fit:contain}.nav-logo.sm{height:32px}.hero-logo{width:280px;max-width:85%;height:auto;margin-bottom:1.5rem}@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-font-smoothing:antialiased}html{font-size:16px}body{font-family:'Inter',-apple-system,system-ui,sans-serif;background:#080c14;color:#fff;line-height:1.5;overflow-x:hidden;min-height:100dvh;touch-action:manipulation}input,select,textarea,button{font-family:inherit;font-size:16px;border:none;outline:none}.page{min-height:100dvh;display:flex;flex-direction:column;padding-bottom:env(safe-area-inset-bottom)}.nav{display:flex;justify-content:space-between;align-items:center;padding:.75rem 1rem;position:sticky;top:0;background:rgba(8,12,20,.97);backdrop-filter:blur(12px);z-index:50;border-bottom:1px solid rgba(255,255,255,.06)}.logo{font-weight:800;font-size:1.1rem}.logo span{color:#e63946}.logo.sm{font-size:1rem}.btn-main{background:#e63946;color:#fff;padding:.8rem 1.25rem;border-radius:12px;font-weight:600;font-size:.9rem;cursor:pointer;width:100%;transition:transform .1s,opacity .1s;-webkit-user-select:none;user-select:none}.btn-main:active{transform:scale(.98);opacity:.9}.btn-main:disabled{background:#333;color:#666}.btn-loading{animation:spin 1s linear infinite;display:inline-block}@keyframes spin{to{transform:rotate(360deg)}}.btn-ghost{background:transparent;border:1.5px solid rgba(255,255,255,.15);color:#fff;padding:.5rem .8rem;border-radius:10px;font-weight:500;font-size:.8rem;cursor:pointer}.btn-ghost.sm{padding:.4rem .6rem;font-size:.75rem}.btn-ghost:active{background:rgba(255,255,255,.05)}.btn-link{background:none;color:rgba(255,255,255,.5);font-size:.85rem;cursor:pointer;margin-top:.75rem;padding:.5rem}.btn-danger{background:transparent;border:1.5px solid #e63946;color:#e63946;padding:.7rem;border-radius:10px;font-weight:600;width:100%}.hero{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:1.5rem 1.25rem}.chip{background:rgba(230,57,70,.15);color:#ff6b6b;padding:.3rem .7rem;border-radius:50px;font-size:.7rem;font-weight:600;margin-bottom:1.25rem}.hero h1{font-size:2rem;font-weight:800;line-height:1.1;margin-bottom:.7rem}.hero h1 span{color:#e63946}.hero p{color:rgba(255,255,255,.5);margin-bottom:1.5rem;font-size:.85rem;max-width:260px}.features{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;padding:0 1rem 1.5rem}.feat{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:.75rem .6rem;text-align:center}.feat span{font-size:1.2rem;display:block;margin-bottom:.3rem}.feat b{font-size:.7rem;display:block;margin-bottom:.15rem}.feat p{font-size:.6rem;color:rgba(255,255,255,.4);line-height:1.3}footer{padding:1.25rem;text-align:center;border-top:1px solid rgba(255,255,255,.06)}.built-by{font-size:.7rem;color:rgba(255,255,255,.4);margin-bottom:.3rem}.built-by span{color:#e63946;font-weight:600}footer p{font-size:.65rem;color:rgba(255,255,255,.3);margin-bottom:.4rem}.foot-links{display:flex;justify-content:center;gap:.8rem}.foot-links a{color:rgba(255,255,255,.4);font-size:.7rem;cursor:pointer;padding:.2rem}.auth-page{padding:.75rem}.back{position:absolute;top:.75rem;left:.75rem;background:none;color:rgba(255,255,255,.5);font-size:.85rem;cursor:pointer;padding:.4rem;z-index:10}.auth-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:1.25rem;margin-top:2.75rem;width:100%;max-width:360px;margin-left:auto;margin-right:auto}.auth-head{text-align:center;margin-bottom:1.25rem}.auth-icon{width:42px;height:42px;background:#e63946;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;margin:0 auto .7rem}.auth-icon.admin{background:#f59e0b}.auth-head h2{font-size:1.1rem}.steps{display:flex;justify-content:center;gap:.35rem;margin-top:.5rem}.steps span{width:24px;height:24px;background:rgba(255,255,255,.08);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:600;color:rgba(255,255,255,.35)}.steps span.on{background:#e63946;color:#fff}.form{display:flex;flex-direction:column;gap:.8rem}.form label{font-size:.8rem;font-weight:500;color:rgba(255,255,255,.7)}.form label.err{color:#ff6b6b}.form input,.form select,.form textarea{width:100%;padding:.75rem .85rem;background:rgba(0,0,0,.35);border:1.5px solid rgba(255,255,255,.1);border-radius:10px;color:#fff;margin-top:.3rem}.form input:focus,.form select:focus{border-color:#e63946}.form input:disabled{opacity:.5}.form input.verified{border-color:#10b981;background:rgba(16,185,129,.08)}.form textarea{min-height:65px;resize:none}.form small{font-size:.65rem;color:rgba(255,255,255,.35);margin-left:.2rem}.verify-notice{display:flex;gap:.6rem;background:rgba(230,57,70,.1);border:1px solid rgba(230,57,70,.2);padding:.8rem;border-radius:10px}.verify-notice span{font-size:1.2rem}.verify-notice b{font-size:.75rem;color:#ff6b6b;display:block;margin-bottom:.1rem}.verify-notice p{font-size:.65rem;color:rgba(255,255,255,.5);margin:0}.btn-verify{background:rgba(16,185,129,.12);border:1.5px solid #10b981;color:#10b981;padding:.75rem;border-radius:10px;font-weight:600;font-size:.85rem;cursor:pointer;width:100%}.btn-verify:disabled{opacity:.5}.verified-box{display:flex;gap:.6rem;align-items:center;background:rgba(16,185,129,.12);border:1px solid #10b981;padding:.8rem;border-radius:10px}.verified-box span{font-size:1.25rem;color:#10b981}.verified-box b{font-size:.85rem;color:#10b981;display:block}.verified-box p{font-size:.65rem;color:rgba(255,255,255,.5);margin:0}.error-box{display:flex;gap:.5rem;background:rgba(230,57,70,.1);border:1px solid rgba(230,57,70,.25);padding:.7rem;border-radius:10px}.error-box span{font-size:1rem}.error-box p{font-size:.75rem;color:#ff6b6b;margin:0;flex:1}.divider{display:flex;align-items:center;gap:.6rem;margin:.3rem 0}.divider::before,.divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.08)}.divider span{font-size:.65rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.04em}.avatar-section{text-align:center;margin-bottom:.4rem}.avatar-preview{display:inline-flex;flex-direction:column;align-items:center;cursor:pointer;padding:.4rem}.avatar-preview span{font-size:2.75rem;display:block;margin-bottom:.2rem}.avatar-preview small{font-size:.65rem;color:rgba(255,255,255,.4)}.avatar-picker{display:flex;flex-wrap:wrap;justify-content:center;gap:.3rem;padding:.65rem;background:rgba(0,0,0,.3);border-radius:10px;margin-top:.4rem}.avatar-picker button{width:38px;height:38px;font-size:1.35rem;background:rgba(255,255,255,.05);border:2px solid transparent;border-radius:9px;cursor:pointer}.avatar-picker button.on{border-color:#e63946;background:rgba(230,57,70,.15)}.chips{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.3rem}.chips button{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.6);padding:.4rem .7rem;border-radius:50px;font-size:.7rem;cursor:pointer}.chips button.on{background:rgba(230,57,70,.18);border-color:#e63946;color:#ff6b6b}.btn-row{display:flex;gap:.6rem;margin-top:.3rem}.btn-row .btn-ghost{flex:1}.btn-row .btn-main{flex:2}.info-box{background:rgba(230,57,70,.08);border:1px solid rgba(230,57,70,.18);padding:.7rem;border-radius:10px;font-size:.75rem;text-align:center}.radios{display:flex;flex-direction:column;gap:.35rem;margin-top:.3rem}.radio{display:flex;align-items:center;gap:.5rem;padding:.7rem;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.08);border-radius:10px;cursor:pointer;font-size:.75rem}.radio input{accent-color:#e63946;width:16px;height:16px}.check{display:flex;align-items:flex-start;gap:.6rem;font-size:.7rem;color:rgba(255,255,255,.5);cursor:pointer;padding:.7rem;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.08);border-radius:10px}.check.err{border-color:rgba(255,107,107,.3);color:#ff6b6b}.check input{margin-top:1px;accent-color:#e63946;width:16px;height:16px;flex-shrink:0}.check span{line-height:1.35}.switch{text-align:center;font-size:.75rem;color:rgba(255,255,255,.4);margin-top:.3rem}.switch a{color:#e63946;cursor:pointer}.err-text{color:#ff6b6b;font-size:.7rem;text-align:center}.app-page{padding-bottom:64px}.app-page.admin{padding-bottom:0}.app-nav{display:flex;justify-content:space-between;align-items:center;padding:.65rem .8rem;background:rgba(8,12,20,.97);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.06);position:sticky;top:0;z-index:50}.tab-bar{display:flex;position:fixed;bottom:0;left:0;right:0;background:rgba(8,12,20,.98);backdrop-filter:blur(12px);border-top:1px solid rgba(255,255,255,.08);padding:.35rem .2rem;padding-bottom:calc(.35rem + env(safe-area-inset-bottom));z-index:100}.tab-bar button{flex:1;display:flex;flex-direction:column;align-items:center;gap:.1rem;padding:.35rem 0;background:none;color:rgba(255,255,255,.4);font-size:.55rem;font-weight:500;cursor:pointer;position:relative;-webkit-user-select:none}.tab-bar button span{font-size:1.15rem}.tab-bar button.on{color:#e63946}.tab-bar button b{position:absolute;top:0;right:50%;transform:translateX(12px);background:#e63946;color:#fff;font-size:.5rem;padding:.08rem .28rem;border-radius:50px;min-width:13px;text-align:center}.app-main{padding:.8rem;flex:1;-webkit-overflow-scrolling:touch}.ptr-container{min-height:100%}.ptr-indicator{display:flex;align-items:center;justify-content:center;font-size:.75rem;color:rgba(255,255,255,.5);overflow:hidden}.ptr-spinner{animation:spin 1s linear infinite}.search-bar{display:flex;align-items:center;gap:.45rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:0 .7rem;margin-bottom:.65rem}.search-bar span{font-size:.95rem;color:rgba(255,255,255,.4)}.search-bar input{flex:1;background:none;border:none;padding:.65rem 0;color:#fff}.search-bar input::placeholder{color:rgba(255,255,255,.35)}.filter-bar{margin-bottom:.75rem;overflow:hidden}.filter-scroll{display:flex;gap:.3rem;overflow-x:auto;padding-bottom:.2rem;scrollbar-width:none;-webkit-overflow-scrolling:touch}.filter-scroll::-webkit-scrollbar{display:none}.filter-scroll button{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.5);padding:.35rem .65rem;border-radius:50px;font-size:.65rem;white-space:nowrap;flex-shrink:0;cursor:pointer}.filter-scroll button.on{background:#e63946;border-color:#e63946;color:#fff}.filter-scroll button.core{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);color:#fbbf24}.filter-scroll button.core.on{background:#f59e0b;color:#000}.filter-scroll button.mutual{background:rgba(168,85,247,.1);border-color:rgba(168,85,247,.3);color:#c084fc}.filter-scroll button.mutual.on{background:#a855f7;color:#fff}.cards{display:flex;flex-direction:column;gap:.65rem;align-items:stretch}.cards .empty-state{width:100%}.card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:13px;padding:.8rem;cursor:pointer;-webkit-user-select:none}.card:active{border-color:rgba(230,57,70,.4)}.card.skeleton{pointer-events:none}.card-top{display:flex;gap:.55rem;margin-bottom:.45rem}.av{width:52px;height:52px;min-width:52px;min-height:52px;background:rgba(255,255,255,.08);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:32px;flex-shrink:0;line-height:1;text-align:center}.av.lg{width:70px;height:70px;min-width:70px;min-height:70px;font-size:42px;border-radius:14px}.av.sm{width:40px;height:40px;min-width:40px;min-height:40px;font-size:24px;border-radius:10px}.card-top b{font-size:.8rem;display:flex;align-items:center;gap:.25rem;flex-wrap:wrap}.card-top>span.av{font-size:32px}.card-top div span{font-size:.65rem;color:rgba(255,255,255,.45);display:block}.conn-count{color:rgba(255,255,255,.35);font-size:.6rem;margin-top:.1rem}.core-badge{background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#000;font-size:.5rem;padding:.08rem .3rem;border-radius:50px;font-weight:600}.mutual-badge{background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.3);color:#c084fc;font-size:.65rem;padding:.3rem .6rem;border-radius:8px;margin-bottom:.4rem;display:inline-block}.bio{font-size:.7rem;color:rgba(255,255,255,.5);margin-bottom:.45rem;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.tags{display:flex;flex-wrap:wrap;gap:.25rem;margin-bottom:.4rem}.tags span{background:rgba(230,57,70,.1);color:#ff8a8a;padding:.18rem .45rem;border-radius:50px;font-size:.6rem}.tags span.mutual{background:rgba(168,85,247,.15);color:#c084fc;border:1px solid rgba(168,85,247,.3)}.card-bot{display:flex;justify-content:flex-end;padding-top:.45rem;border-top:1px solid rgba(255,255,255,.05)}.btn-connect{background:#e63946;color:#fff;padding:.35rem .8rem;border-radius:8px;font-size:.7rem;font-weight:600;cursor:pointer}.btn-accept{background:#10b981;color:#fff;padding:.35rem .8rem;border-radius:8px;font-size:.7rem;font-weight:600;cursor:pointer}.status-badge{font-size:.65rem;padding:.25rem .55rem;border-radius:50px}.status-badge.connected{background:rgba(16,185,129,.15);color:#10b981}.status-badge.pending{background:rgba(255,255,255,.08);color:rgba(255,255,255,.5)}.contact-box{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);padding:.55rem .7rem;border-radius:9px;display:flex;justify-content:space-between;align-items:center;margin-top:.4rem}.contact-box span{font-size:.75rem;color:#10b981}.contact-box a{font-size:.7rem;color:#3b82f6;text-decoration:none}.contact-links{display:flex;gap:.5rem;align-items:center}.wa-btn{background:rgba(37,211,102,.15);color:#25d366 !important;padding:.25rem .5rem;border-radius:6px;font-weight:500}.empty-state{text-align:center;padding:2.5rem 1.5rem;display:flex;flex-direction:column;align-items:center}.empty-icon{font-size:3rem;margin-bottom:.75rem;opacity:.8}.empty-state h3{font-size:.9rem;color:rgba(255,255,255,.7);margin-bottom:.35rem}.empty-state p{font-size:.75rem;color:rgba(255,255,255,.4);margin-bottom:1rem;max-width:220px}.empty-state .btn-main{width:auto;padding:.6rem 1.25rem}.skel-avatar{width:38px;height:38px;background:rgba(255,255,255,.08);border-radius:10px;animation:pulse 1.5s infinite}.skel-text-group{flex:1}.skel-text{height:12px;background:rgba(255,255,255,.08);border-radius:6px;margin-bottom:.4rem;animation:pulse 1.5s infinite}.skel-text.w70{width:70%}.skel-text.w50{width:50%}.skel-text.w90{width:90%;margin:.5rem 0}.skel-tags{display:flex;gap:.25rem}.skel-tag{width:50px;height:20px;background:rgba(255,255,255,.08);border-radius:50px;animation:pulse 1.5s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}.mt{margin-top:.75rem}.requests-section h3{font-size:.8rem;color:rgba(255,255,255,.5);margin:1rem 0 .55rem;padding-top:.45rem;border-top:1px solid rgba(255,255,255,.06)}.requests-section h3:first-child{margin-top:0;padding-top:0;border-top:none}.req-item{display:flex;align-items:center;gap:.55rem;padding:.65rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;margin-bottom:.4rem}.req-item .info{flex:1;min-width:0}.req-item b{font-size:.8rem;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.req-item span{font-size:.65rem;color:rgba(255,255,255,.45)}.req-actions{display:flex;gap:.3rem}.btn-sm{width:32px;height:32px;border-radius:8px;font-size:.8rem;cursor:pointer;display:flex;align-items:center;justify-content:center;border:none}.btn-sm.accept{background:#10b981;color:#fff}.btn-sm.decline{background:rgba(230,57,70,.15);color:#e63946}.btn-sm.cancel{width:auto;padding:0 .65rem;background:rgba(255,255,255,.08);color:rgba(255,255,255,.6);font-size:.65rem}.muted{color:rgba(255,255,255,.3);font-size:.75rem;text-align:center;padding:1rem}.profile-section{display:flex;flex-direction:column;gap:.75rem}.profile-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:13px;padding:1.1rem;text-align:center}.profile-card .av{margin:0 auto .55rem}.profile-card h2{font-size:1rem;margin-bottom:.15rem}.profile-card>p{font-size:.7rem;color:rgba(255,255,255,.45)}.profile-card .contact-info{font-size:.75rem;color:rgba(255,255,255,.55);margin:.1rem 0}.profile-card .linkedin-link{display:inline-block;font-size:.75rem;color:#3b82f6;margin:.3rem 0;text-decoration:none}.stats-row{display:flex;justify-content:center;gap:1.5rem;margin:.75rem 0}.mini-stat{text-align:center}.mini-stat b{font-size:1.1rem;display:block;color:#e63946}.mini-stat span{font-size:.6rem;color:rgba(255,255,255,.45)}.profile-card .bio{margin:.55rem 0;text-align:center}.profile-card .tags{justify-content:center;margin-top:.45rem}.settings,.danger{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:.75rem}.settings h4,.danger h4{font-size:.8rem;margin-bottom:.55rem}.settings label{display:flex;justify-content:space-between;align-items:center;font-size:.75rem}.settings select{padding:.35rem .55rem;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:7px;color:#fff;font-size:.75rem}.danger{border-color:rgba(230,57,70,.25);border-style:dashed}.feedback-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:11px;overflow:hidden}.feedback-card.submitted{padding:1.25rem;text-align:center}.feedback-card.submitted span{font-size:2rem;color:#10b981;display:block;margin-bottom:.35rem}.feedback-card.submitted p{color:rgba(255,255,255,.6);font-size:.8rem}.fb-toggle{display:flex;align-items:center;justify-content:space-between;padding:.75rem;cursor:pointer}.fb-toggle div{display:flex;align-items:center;gap:.55rem}.fb-toggle span:first-child{font-size:1.25rem}.fb-toggle b{font-size:.8rem;display:block}.fb-toggle p{font-size:.65rem;color:rgba(255,255,255,.45);margin:0}.fb-toggle .arrow{color:rgba(255,255,255,.4);font-size:.7rem}.fb-form{padding:0 .75rem .75rem;border-top:1px solid rgba(255,255,255,.06)}.fb-form label{display:block;font-size:.75rem;color:rgba(255,255,255,.6);margin-top:.65rem;margin-bottom:.3rem}.fb-form .required{color:#e63946}.rating-stars{display:flex;gap:.25rem}.rating-stars button{background:none;border:none;font-size:1.5rem;color:rgba(255,255,255,.2);cursor:pointer;padding:.15rem}.rating-stars button.on{color:#fbbf24}.fb-types{display:flex;flex-wrap:wrap;gap:.25rem}.fb-types button{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.55);padding:.35rem .6rem;border-radius:50px;font-size:.65rem;cursor:pointer}.fb-types button.on{background:rgba(230,57,70,.15);border-color:#e63946;color:#ff6b6b}.fb-form textarea{width:100%;padding:.6rem;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.8rem;min-height:70px;resize:none;margin-top:.25rem}.fb-form .btn-main{margin-top:.65rem}.feedback-list{display:flex;flex-direction:column;gap:.4rem}.feedback-item{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:.65rem}.fb-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem}.fb-header b{font-size:.8rem}.fb-header span{font-size:.7rem;color:#fbbf24}.fb-type{font-size:.6rem;color:#e63946;background:rgba(230,57,70,.1);display:inline-block;padding:.15rem .4rem;border-radius:50px;margin-bottom:.35rem}.fb-text{font-size:.75rem;color:rgba(255,255,255,.7);line-height:1.4;margin-bottom:.35rem}.fb-time{font-size:.6rem;color:rgba(255,255,255,.35)}.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.88);display:flex;align-items:flex-end;justify-content:center;z-index:200}.modal{background:#0d1117;border:1px solid rgba(255,255,255,.1);border-radius:18px 18px 0 0;width:100%;max-width:400px;max-height:82vh;overflow-y:auto;position:relative;padding-bottom:env(safe-area-inset-bottom);-webkit-overflow-scrolling:touch}.modal.sm{max-height:42vh}.close{position:absolute;top:.75rem;right:.75rem;background:rgba(255,255,255,.1);width:28px;height:28px;border-radius:50%;color:#fff;font-size:.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center}.modal-top{text-align:center;padding:1.1rem 1.1rem .75rem}.modal-top .av{margin:0 auto .55rem}.modal-top h2{font-size:1rem;display:flex;align-items:center;justify-content:center;gap:.3rem;flex-wrap:wrap}.modal-top p{font-size:.7rem;color:rgba(255,255,255,.45);margin-top:.1rem}.modal-conn-count{font-size:.65rem;color:rgba(255,255,255,.4);display:block;margin-top:.3rem}.modal-mutual{display:flex;align-items:center;gap:.5rem;background:rgba(168,85,247,.1);border:1px solid rgba(168,85,247,.25);margin:0 1.1rem .75rem;padding:.65rem;border-radius:10px}.modal-mutual span{font-size:1.1rem}.modal-mutual p{font-size:.75rem;color:#c084fc;margin:0;flex:1}.modal-sec{padding:0 1.1rem;margin-bottom:.75rem}.modal-sec h4{font-size:.6rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.35rem}.modal-sec p{font-size:.75rem;color:rgba(255,255,255,.6)}.modal-sec.contact{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);margin:0 1.1rem .75rem;padding:.75rem;border-radius:10px}.modal-sec.contact h4{color:#10b981}.modal-sec.contact a{display:block;font-size:.75rem;color:#3b82f6;margin-top:.3rem;text-decoration:none}.modal-bot{padding:.75rem 1.1rem 1.1rem;display:flex;flex-direction:column;gap:.45rem;align-items:center}.modal-actions{display:flex;gap:.45rem;width:100%}.modal-actions .btn-main,.modal-actions .btn-ghost{flex:1}.connected-badge{color:#10b981;font-weight:600;font-size:.8rem}.pending-badge{color:rgba(255,255,255,.5);font-size:.8rem}.btn-report{background:none;border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.4);padding:.35rem .75rem;border-radius:8px;font-size:.7rem;cursor:pointer;margin-top:.2rem}.modal select{width:calc(100% - 2.2rem);padding:.7rem;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#fff;margin:.75rem 1.1rem}.modal h2{text-align:center;font-size:.95rem;padding-top:1.1rem}.admin-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.35rem;margin-bottom:.75rem}.stat{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:.55rem;text-align:center}.stat b{font-size:1.1rem;display:block}.stat span{font-size:.55rem;color:rgba(255,255,255,.45)}.stat.warn{border-color:rgba(245,158,11,.35);background:rgba(245,158,11,.08)}.tabs{display:flex;gap:.35rem;margin-bottom:.75rem}.tabs button{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.55);padding:.45rem;border-radius:8px;font-size:.7rem;cursor:pointer}.tabs button.on{background:#e63946;border-color:#e63946;color:#fff}.admin-list{display:flex;flex-direction:column;gap:.35rem}.admin-item{display:flex;align-items:center;gap:.55rem;padding:.65rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px}.admin-item.flagged{border-color:rgba(245,158,11,.35);background:rgba(245,158,11,.05)}.admin-item .info{flex:1;min-width:0}.admin-item b{font-size:.8rem}.admin-item span{font-size:.6rem;color:rgba(255,255,255,.45);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.admin-item .phone{color:#10b981}.acts{display:flex;gap:.25rem}.sm-btn{width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:.7rem;display:flex;align-items:center;justify-content:center;border:none}.sm-btn.green{background:#10b981;color:#fff}.sm-btn.red{background:rgba(230,57,70,.15);color:#e63946}.empty{text-align:center;padding:1.25rem;color:rgba(255,255,255,.35);font-size:.75rem}.static{padding:.75rem}.static-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:1.1rem;margin-top:2.75rem;max-width:360px;margin-left:auto;margin-right:auto}.static-card h1{font-size:1rem;margin-bottom:.85rem}.static-card section{margin-bottom:.85rem}.static-card h3{font-size:.8rem;color:#e63946;margin-bottom:.25rem}.static-card p{font-size:.75rem;color:rgba(255,255,255,.55);line-height:1.4}.how{display:grid;grid-template-columns:1fr 1fr;gap:.55rem;margin:1rem 0}.how div{background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.07);padding:.75rem .65rem;border-radius:10px;text-align:center;position:relative}.how b{position:absolute;top:-6px;left:-6px;width:20px;height:20px;background:#e63946;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.6rem}.how h4{font-size:.75rem;margin-bottom:.15rem}.how p{font-size:.6rem;color:rgba(255,255,255,.45);margin:0}.toast{position:fixed;top:.75rem;left:.75rem;right:.75rem;background:#0d1117;border:1px solid #10b981;padding:.65rem .8rem;border-radius:10px;font-size:.75rem;z-index:300;animation:toast .2s ease}.toast.info{border-color:#f59e0b}@keyframes toast{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}@media(min-width:768px){.hero h1{font-size:2.5rem}.features{grid-template-columns:repeat(4,1fr);max-width:650px;margin:0 auto 1.5rem}.auth-card{margin-top:3.5rem}.cards{display:grid;grid-template-columns:repeat(2,1fr)}.modal-bg{align-items:center;padding:.75rem}.modal{border-radius:18px;max-height:80vh}.tab-bar{position:static;background:transparent;border:none;justify-content:center;gap:.35rem;padding:.75rem}.tab-bar button{flex:none;flex-direction:row;padding:.45rem .8rem;border-radius:8px;font-size:.75rem;gap:.3rem}.tab-bar button span{font-size:.9rem}.tab-bar button.on{background:rgba(230,57,70,.12)}.tab-bar button b{position:static;transform:none;margin-left:.25rem}.app-page{padding-bottom:0}}.avatar-inline{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.35rem}.avatar-inline button{width:40px;height:40px;font-size:1.3rem;background:transparent;border:2px solid rgba(255,255,255,.1);border-radius:10px;cursor:pointer;transition:all .15s}.avatar-inline button:hover{border-color:rgba(255,255,255,.2)}.avatar-inline button.on{border-color:#e63946;background:rgba(230,57,70,.12);transform:scale(1.05)}.btn-qr{background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.3);color:#c084fc;padding:.6rem;border-radius:10px;font-size:.8rem;cursor:pointer;margin-top:.75rem;width:100%}.btn-qr:active{opacity:.8}.qr-modal{max-height:75vh}.qr-content{padding:1.5rem;text-align:center}.qr-content h2{font-size:1.1rem;margin-bottom:.25rem;padding:0}.qr-content>p{font-size:.75rem;color:rgba(255,255,255,.5);margin-bottom:1rem}.qr-code{background:#fff;padding:1rem;border-radius:12px;display:inline-block;margin-bottom:1rem}.qr-svg{width:150px;height:150px}.qr-profile{display:flex;align-items:center;gap:.6rem;background:rgba(255,255,255,.05);padding:.75rem;border-radius:10px;margin-bottom:.75rem}.qr-profile b{font-size:.85rem;display:block}.qr-profile span{font-size:.7rem;color:rgba(255,255,255,.45)}.qr-hint{font-size:.65rem;color:rgba(255,255,255,.35);font-style:italic}.announcement-banner{display:flex;align-items:center;gap:.5rem;background:linear-gradient(135deg,rgba(230,57,70,.15),rgba(245,158,11,.1));border:1px solid rgba(245,158,11,.3);padding:.65rem .75rem;border-radius:10px;margin-bottom:.75rem}.announcement-banner span{font-size:1.1rem}.announcement-banner p{font-size:.75rem;color:rgba(255,255,255,.8);margin:0;flex:1;line-height:1.35}.announce-section h4{font-size:.8rem;color:rgba(255,255,255,.5);margin:1rem 0 .5rem}.announce-form textarea{width:100%;padding:.65rem;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#fff;font-size:.85rem;min-height:80px;resize:none;margin-bottom:.5rem}.announce-item{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:.75rem;margin-bottom:.4rem}.announce-item p{font-size:.8rem;color:rgba(255,255,255,.75);margin:0 0 .4rem;line-height:1.4}.announce-meta{display:flex;justify-content:space-between;align-items:center}.announce-meta span{font-size:.6rem;color:rgba(255,255,255,.35)}.announce-meta button{background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:.75rem}.core-team-btn{display:flex;align-items:center;gap:.6rem;width:100%;background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(251,191,36,.08));border:1px solid rgba(245,158,11,.35);padding:.75rem;border-radius:12px;margin-bottom:.75rem;cursor:pointer;text-align:left}.core-team-btn>span:first-child{font-size:1.5rem}.core-team-btn div{flex:1}.core-team-btn b{font-size:.85rem;color:#fbbf24;display:block}.core-team-btn p{font-size:.65rem;color:rgba(255,255,255,.5);margin:0}.core-team-btn .arrow{font-size:1rem;color:rgba(255,255,255,.3)}.core-team-btn:active{opacity:.9}.dashboard h3{font-size:1rem;margin-bottom:.75rem;color:rgba(255,255,255,.8)}.dash-stats{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:1rem}.dash-stat{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:.75rem;text-align:center}.dash-stat.big{background:linear-gradient(135deg,rgba(230,57,70,.1),rgba(230,57,70,.05))}.dash-stat .dash-icon{font-size:1.5rem;display:block;margin-bottom:.25rem}.dash-stat b{font-size:1.5rem;display:block;color:#fff}.dash-stat span{font-size:.65rem;color:rgba(255,255,255,.45)}.dash-section{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:.75rem;margin-bottom:.75rem}.dash-section h4{font-size:.8rem;color:rgba(255,255,255,.6);margin-bottom:.6rem}.dash-bars{display:flex;flex-direction:column;gap:.5rem}.dash-bar{display:flex;align-items:center;gap:.5rem}.bar-label{font-size:.7rem;color:rgba(255,255,255,.6);width:70px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bar-track{flex:1;height:8px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden}.bar-fill{height:100%;background:linear-gradient(90deg,#e63946,#ff6b6b);border-radius:4px;transition:width .3s}.bar-fill.college{background:linear-gradient(90deg,#3b82f6,#60a5fa)}.bar-count{font-size:.7rem;color:rgba(255,255,255,.5);width:24px;text-align:right}.activity-list{display:flex;flex-direction:column;gap:.4rem}.activity-item{display:flex;align-items:center;gap:.5rem;padding:.5rem;background:rgba(255,255,255,.03);border-radius:8px}.activity-item span{font-size:1rem}.activity-item p{font-size:.75rem;color:rgba(255,255,255,.6);margin:0}.report-section{display:flex;flex-direction:column;gap:.75rem}.report-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:1rem;text-align:center}.report-card>span{font-size:2rem;display:block;margin-bottom:.5rem}.report-card h4{font-size:.9rem;margin-bottom:.35rem}.report-card p{font-size:.7rem;color:rgba(255,255,255,.5);margin-bottom:.75rem}.report-preview{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:1rem}.report-preview h4{font-size:.8rem;color:rgba(255,255,255,.6);margin-bottom:.6rem}.preview-stats{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}.preview-stats div{background:rgba(255,255,255,.05);padding:.5rem;border-radius:8px;text-align:center;font-size:.7rem;color:rgba(255,255,255,.6)}.preview-stats b{display:block;font-size:1rem;color:#e63946;margin-bottom:.15rem}.phone-input{display:flex;align-items:center;background:rgba(0,0,0,.35);border:1.5px solid rgba(255,255,255,.1);border-radius:10px;margin-top:.3rem;overflow:hidden}.phone-input:focus-within{border-color:#e63946}.phone-prefix{padding:.75rem;background:rgba(255,255,255,.05);color:rgba(255,255,255,.6);font-weight:600;font-size:.9rem;border-right:1px solid rgba(255,255,255,.1)}.phone-input input{flex:1;padding:.75rem;background:transparent;border:none;color:#fff;margin:0}.phone-input input:disabled{opacity:.5}.phone-input input.verified{background:rgba(16,185,129,.08)}.leaderboard-section{padding-bottom:1rem}.leaderboard-header{display:flex;align-items:center;gap:.75rem;margin-bottom:1rem}.leaderboard-header span{font-size:2.5rem}.leaderboard-header h2{font-size:1.1rem;margin:0}.leaderboard-header p{font-size:.7rem;color:rgba(255,255,255,.5);margin:0}.leaderboard-list{display:flex;flex-direction:column;gap:.4rem;margin-bottom:1rem}.leaderboard-item{display:flex;align-items:center;gap:.5rem;padding:.65rem .75rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;cursor:pointer}.leaderboard-item.top3{background:linear-gradient(135deg,rgba(251,191,36,.08),rgba(245,158,11,.04));border-color:rgba(251,191,36,.2)}.leaderboard-item.is-me{background:rgba(230,57,70,.08);border-color:rgba(230,57,70,.25)}.leaderboard-item .rank{font-size:1.1rem;width:28px;text-align:center}.leaderboard-item .info{flex:1;min-width:0}.leaderboard-item b{font-size:.8rem;display:flex;align-items:center;gap:.35rem}.leaderboard-item span{font-size:.65rem;color:rgba(255,255,255,.45)}.you-badge{background:#e63946;color:#fff;font-size:.5rem;padding:.1rem .35rem;border-radius:50px;font-weight:600}.conn-score{text-align:right}.conn-score b{font-size:1rem;color:#fbbf24;display:block}.conn-score span{font-size:.55rem;color:rgba(255,255,255,.4)}.your-rank{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:.75rem;text-align:center;margin-bottom:1rem}.your-rank p{font-size:.85rem;margin:0 0 .2rem;color:rgba(255,255,255,.7)}.your-rank span{font-size:.7rem;color:rgba(255,255,255,.45)}.leaderboard-badges h3{font-size:.85rem;color:rgba(255,255,255,.6);margin-bottom:.6rem}.badges-grid{display:grid;grid-template-columns:1fr 1fr;gap:.4rem}.badge-item{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:.6rem;text-align:center}.badge-item span{font-size:1.5rem;display:block;margin-bottom:.25rem}.badge-item b{font-size:.7rem;display:block;margin-bottom:.15rem}.badge-item p{font-size:.6rem;color:rgba(255,255,255,.4);margin:0}.load-more-btn{width:100%;padding:.75rem;background:rgba(255,255,255,.05);border:1px dashed rgba(255,255,255,.15);border-radius:12px;color:rgba(255,255,255,.6);font-size:.8rem;cursor:pointer;margin-top:.5rem}.load-more-btn:active{background:rgba(255,255,255,.08)}.results-count{font-size:.7rem;color:rgba(255,255,255,.4);margin-bottom:.5rem}.search-loading{font-size:.7rem;color:#fbbf24;margin-bottom:.5rem;animation:pulse 1s infinite}.fb-events{display:grid;grid-template-columns:1fr 1fr;gap:.35rem;margin-top:.3rem}.fb-events button{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.6);padding:.5rem;border-radius:8px;font-size:.75rem;cursor:pointer;text-align:center}.fb-events button.on{background:rgba(230,57,70,.15);border-color:#e63946;color:#ff6b6b}.fb-event-tag{background:#e63946;color:#fff;font-size:.6rem;padding:.15rem .4rem;border-radius:50px;font-weight:600}.fb-ratings{display:flex;gap:.5rem;margin:.5rem 0}.fb-rating-item{flex:1;background:rgba(255,255,255,.05);padding:.4rem;border-radius:6px;text-align:center}.fb-rating-item span{font-size:.55rem;color:rgba(255,255,255,.5);display:block}.fb-rating-item b{font-size:.7rem;color:#fbbf24}.fb-events{display:flex;flex-direction:column;gap:.4rem;margin-top:.3rem}.fb-events button{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.6);padding:.6rem;border-radius:10px;cursor:pointer;text-align:left}.fb-events button b{display:block;font-size:.8rem;color:#fff;margin-bottom:.15rem}.fb-events button span{font-size:.65rem;color:rgba(255,255,255,.45)}.fb-events button.on{background:rgba(230,57,70,.12);border-color:#e63946}.fb-events button.on b{color:#ff6b6b}.fb-divider{display:flex;align-items:center;gap:.5rem;margin:.75rem 0 .5rem}.fb-divider::before,.fb-divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.1)}.fb-divider span{font-size:.65rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.03em}.fb-specific{display:flex;flex-direction:column;gap:.35rem;margin:.5rem 0;padding:.5rem;background:rgba(255,255,255,.03);border-radius:8px}.fb-q{display:flex;justify-content:space-between;align-items:center;padding:.3rem 0}.fb-q span{font-size:.65rem;color:rgba(255,255,255,.5);flex:1}.fb-q b{font-size:.7rem;color:#fbbf24}.feedback-section{display:flex;flex-direction:column;gap:.5rem}.feedback-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem}.feedback-header h3{font-size:.9rem;margin:0;color:rgba(255,255,255,.7)}`;

  return (<><style>{css}</style><Toast />{view === 'landing' && <Landing />}{view === 'signup' && <Signup />}{view === 'login' && <Login />}{view === 'adminLogin' && <AdminLogin />}{view === 'admin' && isAdmin && <Admin />}{view === 'app' && <App />}{view === 'privacy' && <Privacy />}{view === 'terms' && <Terms />}{view === 'about' && <About />}</>);
};

export default StrategiaConnect;

/**
 * EXPLANATION:
 * This database acts as the core knowledge graph for AgriOptima's recommendation engine.
 * Each crop object contains specific agronomic and economic variables used by the optimization algorithm.
 * By modularizing this data, the application is pre-structured for scaling to a full Node.js/MongoDB backend.
 */

const cropDatabase = [
    // Kharif Crops (Monsoon: June - October)
    { id: "C001", name: "Rice (Paddy)", seasons: ["Kharif"], water_req: 5000, yield_per_acre: 1.5, est_price: 20000, soil_types: ["clay", "loamy"], ph_min: 5.0, ph_max: 6.5, resilience: 0.4, carbon_per_kg: 2.5, groundwater_impact: 1.0, organic_bonus: 0 },
    { id: "C002", name: "Cotton", seasons: ["Kharif"], water_req: 3000, yield_per_acre: 0.8, est_price: 35000, soil_types: ["loamy", "sandy"], ph_min: 5.5, ph_max: 7.5, resilience: 0.7, carbon_per_kg: 1.5, groundwater_impact: 0.8, organic_bonus: 5 },
    { id: "C003", name: "Maize", seasons: ["Kharif"], water_req: 2500, yield_per_acre: 2.0, est_price: 15000, soil_types: ["loamy"], ph_min: 5.8, ph_max: 7.0, resilience: 0.6, carbon_per_kg: 0.8, groundwater_impact: 0.6, organic_bonus: 5 },
    { id: "C004", name: "Soybean", seasons: ["Kharif"], water_req: 2000, yield_per_acre: 1.2, est_price: 30000, soil_types: ["loamy", "clay"], ph_min: 6.0, ph_max: 7.0, resilience: 0.65, carbon_per_kg: 0.4, groundwater_impact: 0.4, organic_bonus: 15 },

    // Rabi Crops (Winter: November - March)
    { id: "C005", name: "Wheat", seasons: ["Rabi"], water_req: 2000, yield_per_acre: 1.8, est_price: 22000, soil_types: ["loamy", "clay"], ph_min: 6.0, ph_max: 7.5, resilience: 0.8, carbon_per_kg: 1.2, groundwater_impact: 0.7, organic_bonus: 5 },
    { id: "C006", name: "Mustard", seasons: ["Rabi"], water_req: 1500, yield_per_acre: 0.6, est_price: 45000, soil_types: ["loamy", "sandy"], ph_min: 6.0, ph_max: 7.5, resilience: 0.75, carbon_per_kg: 0.6, groundwater_impact: 0.4, organic_bonus: 10 },
    { id: "C007", name: "Barley", seasons: ["Rabi"], water_req: 1800, yield_per_acre: 1.5, est_price: 18000, soil_types: ["loamy", "sandy"], ph_min: 6.0, ph_max: 8.0, resilience: 0.85, carbon_per_kg: 0.7, groundwater_impact: 0.5, organic_bonus: 8 },
    { id: "C008", name: "Gram (Chickpea)", seasons: ["Rabi"], water_req: 1200, yield_per_acre: 0.5, est_price: 50000, soil_types: ["loamy", "clay"], ph_min: 6.0, ph_max: 7.5, resilience: 0.8, carbon_per_kg: 0.3, groundwater_impact: 0.3, organic_bonus: 20 },

    // Zaid Crops (Summer: March - June)
    { id: "C009", name: "Watermelon", seasons: ["Zaid"], water_req: 3500, yield_per_acre: 8.0, est_price: 8000, soil_types: ["sandy", "loamy"], ph_min: 6.0, ph_max: 7.0, resilience: 0.5, carbon_per_kg: 0.5, groundwater_impact: 0.8, organic_bonus: 5 },
    { id: "C010", name: "Cucumber", seasons: ["Zaid"], water_req: 2500, yield_per_acre: 5.0, est_price: 12000, soil_types: ["loamy", "sandy"], ph_min: 6.0, ph_max: 7.0, resilience: 0.45, carbon_per_kg: 0.4, groundwater_impact: 0.6, organic_bonus: 5 },
    { id: "C011", name: "Moong Dal", seasons: ["Zaid"], water_req: 1000, yield_per_acre: 0.4, est_price: 60000, soil_types: ["loamy", "clay"], ph_min: 6.3, ph_max: 7.2, resilience: 0.9, carbon_per_kg: 0.2, groundwater_impact: 0.2, organic_bonus: 20 },
    { id: "C012", name: "Sunflower", seasons: ["Zaid"], water_req: 1800, yield_per_acre: 0.7, est_price: 40000, soil_types: ["loamy", "sandy"], ph_min: 6.0, ph_max: 7.5, resilience: 0.7, carbon_per_kg: 0.6, groundwater_impact: 0.5, organic_bonus: 10 }
];

const ESG_CONSTANTS = {
    CARBON_BENCHMARK: 1500, // kg CO2 per acre benchmark
    WATER_SCARCITY_THRESHOLD: 0.7,
    ORGANIC_SCORE_MAX: 100
};

const indianStates = {
    "Andhra Pradesh": { lat: 15.9129, lon: 79.7400 },
    "Arunachal Pradesh": { lat: 28.2180, lon: 94.7278 },
    "Assam": { lat: 26.2006, lon: 92.9376 },
    "Bihar": { lat: 25.0961, lon: 85.3131 },
    "Chhattisgarh": { lat: 21.2787, lon: 81.8661 },
    "Goa": { lat: 15.2993, lon: 74.1240 },
    "Gujarat": { lat: 22.2587, lon: 71.1924 },
    "Haryana": { lat: 29.0588, lon: 76.0856 },
    "Himachal Pradesh": { lat: 31.1048, lon: 77.1734 },
    "Jharkhand": { lat: 23.6102, lon: 85.2799 },
    "Karnataka": { lat: 15.3173, lon: 75.7139 },
    "Kerala": { lat: 10.8505, lon: 76.2711 },
    "Madhya Pradesh": { lat: 22.9734, lon: 78.6569 },
    "Maharashtra": { lat: 19.7515, lon: 75.7139 },
    "Manipur": { lat: 24.6637, lon: 93.9063 },
    "Meghalaya": { lat: 25.4670, lon: 91.3662 },
    "Mizoram": { lat: 23.1645, lon: 92.9376 },
    "Nagaland": { lat: 26.1584, lon: 94.5624 },
    "Odisha": { lat: 20.9517, lon: 85.0985 },
    "Punjab": { lat: 31.1471, lon: 75.3412 },
    "Rajasthan": { lat: 27.0238, lon: 74.2179 },
    "Sikkim": { lat: 27.5330, lon: 88.5122 },
    "Tamil Nadu": { lat: 11.1271, lon: 78.6569 },
    "Telangana": { lat: 18.1124, lon: 79.0193 },
    "Tripura": { lat: 23.9408, lon: 91.9882 },
    "Uttar Pradesh": { lat: 26.8467, lon: 80.9462 },
    "Uttarakhand": { lat: 30.0668, lon: 79.0193 },
    "West Bengal": { lat: 22.9868, lon: 87.8550 },
    "Andaman and Nicobar Islands": { lat: 11.7401, lon: 92.6586 },
    "Chandigarh": { lat: 30.7333, lon: 76.7794 },
    "Dadra and Nagar Haveli and Daman and Diu": { lat: 20.4283, lon: 72.8397 },
    "Delhi": { lat: 28.6139, lon: 77.2090 },
    "Jammu and Kashmir": { lat: 33.7782, lon: 76.5762 },
    "Ladakh": { lat: 34.1526, lon: 77.5770 },
    "Lakshadweep": { lat: 10.5667, lon: 72.6417 },
    "Puducherry": { lat: 11.9416, lon: 79.8083 }
};

// Group months into Indian agricultural seasons
function getSeason(monthValue) {
    const month = parseInt(monthValue);
    // Zaid: Mar (3), Apr (4), May (5)
    // Kharif: Jun (6), Jul (7), Aug (8), Sep (9), Oct (10)
    // Rabi: Nov (11), Dec (12), Jan (1), Feb (2)
    if ([3, 4, 5].includes(month)) return "Zaid";
    if ([6, 7, 8, 9, 10].includes(month)) return "Kharif";
    return "Rabi";
}

// Export for use in app.js

const stateDistricts = {
    "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
    "Arunachal Pradesh": ["Tawang", "West Kameng", "East Kameng", "Papum Pare", "Kurung Kumey", "Kra Daadi", "Lower Subansiri", "Upper Subansiri", "West Siang", "East Siang", "Siang", "Upper Siang", "Lower Siang", "Lower Dibang Valley", "Dibang Valley", "Anjaw", "Lohit", "Namsai", "Changlang", "Tirap", "Longding"],
    "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup Metropolitan", "Kamrup", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
    "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
    "Chhattisgarh": ["Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker", "Kondagaon", "Korba", "Koriya", "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur", "Surguja"],
    "Goa": ["North Goa", "South Goa"],
    "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
    "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
    "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"],
    "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahibganj", "Seraikela Kharsawan", "Simdega", "West Singhbhum"],
    "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"],
    "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
    "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
    "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
    "Manipur": ["Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"],
    "Meghalaya": ["East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"],
    "Mizoram": ["Aizawl", "Champhai", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Serchhip"],
    "Nagaland": ["Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Peren", "Phek", "Tuensang", "Wokha", "Zunheboto"],
    "Odisha": ["Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"],
    "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Nawanshahr", "Pathankot", "Patiala", "Rupnagar", "Sahibzada Ajit Singh Nagar", "Sangrur", "Tarn Taran"],
    "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
    "Sikkim": ["East Sikkim", "North Sikkim", "South Sikkim", "West Sikkim"],
    "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
    "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Komaram Bheem", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak", "Medchal", "Nagarkurnool", "Nalgonda", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Ranga Reddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"],
    "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
    "Uttar Pradesh": ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Badaun", "Baghpat", "Bahraich", "Balia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", "Kushinagar", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
    "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"],
    "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"],
    "Andaman and Nicobar Islands": ["North and Middle Andaman", "South Andaman", "Nicobar"],
    "Chandigarh": ["Chandigarh"],
    "Dadra and Nagar Haveli and Daman and Diu": ["Dadra and Nagar Haveli", "Daman", "Diu"],
    "Delhi": ["New Delhi", "North Delhi", "South Delhi", "West Delhi", "East Delhi", "North West Delhi", "North East Delhi", "South West Delhi", "South East Delhi", "Shahdara", "Central Delhi"],
    "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Kathua", "Kupwara", "Pulwama", "Samba", "Udhampur", "Budgam", "Ganderbal", "Kulgam", "Poonch", "Rajouri", "Ramban", "Reasi", "Shopian"],
    "Ladakh": ["Leh", "Kargil"],
    "Lakshadweep": ["Lakshadweep"],
    "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"],

    // --- Major City Expansions ---
    "Patna": ["Patna Sadar", "Phulwari Sharif", "Danapur", "Bihta", "Maner", "Sampatchak", "Punpun"],
    "Raipur": ["Raipur", "Abhanpur", "Arang", "Dharsiwa", "Tilda"],
    "Ranchi": ["Ranchi", "Kanke", "Ormanjhi", "Angara", "Namkum", "Ratu"],
    "Ernakulam": ["Angamaly", "Aluva", "Paravur", "Vypin", "Edappally", "Kochi"],
    "Indore": ["Indore", "Depalpur", "Mhow", "Sanwer"],
    "Jaipur": ["Jaipur", "Amber", "Bassi", "Chaksu", "Jhotwara", "Sanganer"],
    "Coimbatore": ["Coimbatore", "Annur", "Madukkarai", "Pollachi", "Sulur"],
    "Hyderabad": ["Amberpet", "Asifnagar", "Bahadurpura", "Charminar", "Khairatabad"],
    "Lucknow": ["Lucknow City", "Malihabad", "Bakshi Ka Talab", "Kakori", "Sarojini Nagar"],
    "Ahmedabad": ["Ahmedabad City", "Daskroi", "Sanand", "Bavla", "Dholka", "Viramgam"],
};


const districtBlocks = {
    // Maharashtra
    "Pune": ["Pune City", "Haveli", "Khed", "Ambegaon", "Junner", "Shirur", "Daund", "Indapur", "Baramati", "Purandar", "Bhor", "Velhe", "Mulshi", "Maval"],
    "Nashik": ["Nashik", "Igatpuri", "Dindori", "Peth", "Trimbakeshwar", "Kalwan", "Deola", "Surgana", "Baglan", "Malegaon", "Nandgaon", "Chandwad", "Niphad", "Sinnar", "Yeola"],
    "Nagpur": ["Nagpur Urban", "Nagpur Rural", "Kamptee", "Hingna", "Katol", "Narkhed", "Savner", "Kalmeshwar", "Ramtek", "Mouda", "Parseoni", "Umred", "Bhiwapur", "Kuhi"],

    // Gujarat
    "Ahmedabad": ["Ahmedabad City", "Daskroi", "Sanand", "Bavla", "Dholka", "Viramgam", "Mandal", "Detroj", "Dhandhuka", "Dholera"],
    "Surat": ["Surat City", "Olpad", "Choryasi", "Kamrej", "Palsana", "Bardoli", "Mahan", "Vyara", "Songadh", "Uchhal", "Nizar", "Mandvi", "Mangrol", "Umarpada"],

    // Uttar Pradesh
    "Lucknow": ["Lucknow City", "Malihabad", "Bakshi Ka Talab", "Lucknow", "Mohanlalganj"],
    "Agra": ["Agra City", "Agra", "Kiraoili", "Kheragarh", "Fatehabad", "Bah"],

    // Karnataka
    "Bengaluru Urban": ["Bengaluru North", "Bengaluru South", "Bengaluru East", "Anekal"],
    "Mysuru": ["Mysuru", "T.Narasipura", "Nanjanagudu", "H.D. Kote", "Hunsur", "Piriyapatna", "K.R. Nagar"],

    // Additional States
    "Kurnool": ["Kurnool", "Kodumur", "C. Belagal", "Veldurthi", "Dhone"],
    "Tawang": ["Tawang", "Jang", "Mukto", "Lumla", "Zemithang"],
    "Dibrugarh": ["Dibrugarh", "Barbaruah", "Lahoal", "Panitola", "Tengakhat"],
    "Patna": ["Patna Sadar", "Phulwari Sharif", "Danapur", "Bihta", "Maner"],
    "Raipur": ["Raipur", "Abhanpur", "Arang", "Dharsiwa", "Tilda"],
    "North Goa": ["Tiswadi", "Bardez", "Pernem", "Bicholim", "Sattari"],
    "Gurugram": ["Gurugram", "Pataudi", "Sohna", "Farrukhnagar"],
    "Shimla": ["Shimla Urban", "Shimla Rural", "Theog", "Rohru", "Rampur"],
    "Ranchi": ["Ranchi", "Kanke", "Ormanjhi", "Angara", "Namkum"],
    "Ernakulam": ["Angamaly", "Aluva", "Paravur", "Vypin", "Edappally"],
    "Indore": ["Indore", "Depalpur", "Mhow", "Sanwer"],
    "Imphal East": ["Sawombung", "Keirao Bitra", "Jiribam"],
    "East Khasi Hills": ["Mawphlang", "Mylliem", "Pynursla", "Shella Bholaganj"],
    "Aizawl": ["Aibawk", "Darlawn", "Phullen", "Thingsulthlah"],
    "Kohima": ["Kohima", "Jakhama", "Sechu-Zubza", "Chiephobozou"],
    "Khordha": ["Bhubaneswar", "Balianta", "Balipatna", "Banapur"],
    "Ludhiana": ["Ludhiana-I", "Ludhiana-II", "Khanna", "Jagraon"],
    "Jaipur": ["Jaipur", "Amber", "Bassi", "Chaksu", "Jhotwara"],
    "East Sikkim": ["Gangtok", "Khamdong", "Pakyong", "Rakdong Tintek"],
    "Coimbatore": ["Coimbatore", "Annur", "Madukkarai", "Periyanayakkanpalayam"],
    "Hyderabad": ["Amberpet", "Asifnagar", "Bahadurpura", "Charminar"],
    "West Tripura": ["Agartala", "Dukli", "Hezamara", "Jirania"],
    "Dehradun": ["Dehradun", "Raipur", "Doiwala", "Sahaspur"],
    "North 24 Parganas": ["Barasat-I", "Barasat-II", "Deganga", "Habra-I"],

    // Union Territories
    "North and Middle Andaman": ["Diglipur", "Mayabunder", "Rangat"],
    "Chandigarh": ["Chandigarh"],
    "Dadra and Nagar Haveli": ["Dadra", "Nagar Haveli"],
    "New Delhi": ["Chanakyapuri", "Delhi Cantonment", "Vasant Vihar"],
    "Jammu": ["Jammu", "Akhnoor", "Bishnah", "R.S. Pura"],
    "Leh": ["Leh", "Khaltsi", "Nubra", "Nyoma"],
    "Lakshadweep": ["Lakshadweep"],
    "Puducherry": ["Puducherry", "Karaikal", "Ozhukarai", "Bahour"],

    // Fallback for others
    "Default": ["Main Tehsil", "Central Block", "Sub-Region 1", "Sub-Region 2"]
};

const mandiHistoricalAverages = {
    "Wheat": { basePrice: 2125, volatility: 0.15, trend: [2100, 2150, 2400, 2350, 2300, 2250, 2200, 2150, 2200, 2250, 2300, 2350] },
    "Rice (Paddy)": { basePrice: 1940, volatility: 0.12, trend: [1900, 1950, 2000, 2050, 2100, 2150, 2200, 2250, 2150, 2000, 1950, 1900] },
    "Cotton": { basePrice: 6500, volatility: 0.25, trend: [6000, 6200, 6500, 6800, 7200, 7500, 8000, 8500, 8200, 7500, 6500, 6200] },
    "Sugarcane": { basePrice: 315, volatility: 0.05, trend: [315, 315, 315, 315, 315, 315, 315, 315, 315, 315, 315, 315] },
    "Maize": { basePrice: 1850, volatility: 0.20, trend: [1800, 1850, 1950, 2050, 2150, 2200, 2100, 2000, 1900, 1850, 1800, 1750] },
    "Soybean": { basePrice: 4500, volatility: 0.18, trend: [4400, 4500, 4700, 4900, 5200, 5500, 5300, 5000, 4600, 4500, 4400, 4300] },
    "Mustard": { basePrice: 5050, volatility: 0.22, trend: [5000, 5200, 5800, 6200, 6500, 6800, 6400, 6000, 5500, 5200, 5000, 4900] },
    "Potato": { basePrice: 1200, volatility: 0.40, trend: [1000, 1100, 1500, 1800, 2000, 2200, 2100, 1800, 1400, 1200, 1100, 1000] },
    "Tomato": { basePrice: 2500, volatility: 0.60, trend: [2000, 3000, 5000, 4000, 2500, 2000, 1500, 4000, 8000, 10000, 5000, 3000] },
    "Onion": { basePrice: 1800, volatility: 0.50, trend: [1500, 1600, 2000, 2500, 3500, 4500, 5000, 4000, 3000, 2500, 2000, 1800] },
    "Barley": { basePrice: 1800, volatility: 0.18, trend: [1700, 1750, 1850, 1950, 2000, 1900, 1800, 1750, 1700, 1650, 1700, 1750] },
    "Gram (Chickpea)": { basePrice: 5000, volatility: 0.20, trend: [4800, 4900, 5200, 5500, 5800, 6000, 5500, 5200, 5000, 4800, 4700, 4800] },
    "Watermelon": { basePrice: 8000, volatility: 0.35, trend: [7000, 8000, 10000, 12000, 9000, 7000, 6000, 6500, 7000, 7500, 8000, 8500] },
    "Cucumber": { basePrice: 12000, volatility: 0.30, trend: [10000, 11000, 14000, 15000, 13000, 11000, 10000, 10500, 11000, 11500, 12000, 12500] },
    "Moong Dal": { basePrice: 60000, volatility: 0.15, trend: [58000, 59000, 62000, 65000, 68000, 70000, 65000, 62000, 60000, 58000, 57000, 58000] },
    "Sunflower": { basePrice: 40000, volatility: 0.22, trend: [38000, 39000, 42000, 45000, 48000, 50000, 45000, 42000, 40000, 38000, 37000, 38000] }
};

const historicalRainfall = {
    "Andhra Pradesh": { Kharif: 600, Rabi: 200, Zaid: 100 },
    "Bihar": { Kharif: 1000, Rabi: 50, Zaid: 80 },
    "Gujarat": { Kharif: 700, Rabi: 20, Zaid: 10 },
    "Haryana": { Kharif: 450, Rabi: 60, Zaid: 30 },
    "Karnataka": { Kharif: 800, Rabi: 150, Zaid: 120 },
    "Maharashtra": { Kharif: 900, Rabi: 80, Zaid: 40 },
    "Punjab": { Kharif: 500, Rabi: 100, Zaid: 50 },
    "Rajasthan": { Kharif: 400, Rabi: 30, Zaid: 20 },
    "Tamil Nadu": { Kharif: 400, Rabi: 500, Zaid: 150 },
    "Uttar Pradesh": { Kharif: 850, Rabi: 70, Zaid: 40 },
    "West Bengal": { Kharif: 1200, Rabi: 120, Zaid: 200 },
    "Default": { Kharif: 600, Rabi: 100, Zaid: 50 }
};

const soilNutrients = {
    acidic: {
        range: [0, 5.5],
        deficiencies: ["Phosphorus", "Calcium", "Magnesium"],
        toxicity: ["Aluminum", "Manganese"],
        suggestion: "Apply Lime to increase pH and improve nutrient availability."
    },
    optimal: {
        range: [5.5, 7.5],
        deficiencies: [],
        suggestion: "Soil pH is optimal. Maintain organic matter for balanced nutrition."
    },
    alkaline: {
        range: [7.5, 14],
        deficiencies: ["Iron", "Manganese", "Boron", "Zinc"],
        suggestion: "Apply Gypsum or elemental Sulfur to lower pH and release locked nutrients."
    }
};

const governmentSchemes = [
    {
        name: "PM-KISAN",
        description: "Income support of ₹6,000/year for all landholding farmer families.",
        eligibility: (inputs) => true, // All farmers
        benefit: "₹2,000 every 4 months",
        applicationLink: "https://pmkisan.gov.in/"
    },
    {
        name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
        description: "Crop insurance against non-preventable natural risks.",
        eligibility: (inputs) => true, // All crops/states generally covered
        benefit: "Risk cover based on sum insured",
        applicationLink: "https://pmfby.gov.in/"
    },
    {
        name: "Per Drop More Crop (Micro Irrigation)",
        description: "Subsidy for Drip and Sprinkler irrigation systems.",
        eligibility: (inputs) => inputs.water_daily < 3000, // Suggest for low water
        benefit: "45% to 55% subsidy on cost",
        applicationLink: "https://pdmc.da.gov.in/"
    },
    {
        name: "Sub-Mission on Seeds and Planting Material",
        description: "Subsidy on certified seeds to increase production.",
        eligibility: (inputs) => ["Rice (Paddy)", "Wheat", "Maize"].includes(inputs.crop),
        benefit: "Verified seed discount up to 50%",
        applicationLink: "https://www.myscheme.gov.in/schemes/ky-smsp"
    },
    {
        name: "State Special: Rythu Bandhu (Telangana)",
        description: "Investment support for agriculture and horticulture crops.",
        eligibility: (inputs) => inputs.state === "Telangana",
        benefit: "₹5,000 per acre per season"
    },
    {
        name: "State Special: Krushak Assistance (Odisha)",
        description: "Livelihood and income augmentation support.",
        eligibility: (inputs) => inputs.state === "Odisha",
        benefit: "Financial assistance for 5 seasons"
    }
];

const apmcHubs = {
    "Andhra Pradesh": { name: "Guntur APMC", dist_km: 45, transport_rate: 15 },
    "Bihar": { name: "Gulabbagh Mandi", dist_km: 60, transport_rate: 12 },
    "Gujarat": { name: "Unjha Mandi", dist_km: 30, transport_rate: 18 },
    "Haryana": { name: "Karnal APMC", dist_km: 25, transport_rate: 14 },
    "Karnataka": { name: "Yeshwanthpur APMC", dist_km: 40, transport_rate: 16 },
    "Maharashtra": { name: "Vashi APMC (Mumbai)", dist_km: 80, transport_rate: 20 },
    "Punjab": { name: "Khanna Mandi", dist_km: 20, transport_rate: 13 },
    "Rajasthan": { name: "Jaipur Mandi", dist_km: 55, transport_rate: 15 },
    "Tamil Nadu": { name: "Koyambedu APMC", dist_km: 50, transport_rate: 17 },
    "Uttar Pradesh": { name: "Agra Mandi", dist_km: 35, transport_rate: 14 },
    "West Bengal": { name: "Kolkata APMC", dist_km: 40, transport_rate: 18 },
    "Default": { name: "Regional APMC Hub", dist_km: 50, transport_rate: 15 }
};

const creditConstants = {
    equity_weight: 0.3, // land size
    repayment_weight: 0.5, // projected profit
    security_weight: 0.2, // water stability
    base_score: 300
};

const HI_TRANSLATIONS = {
    // Header & Toggles
    "app_title": "AgriOptima: किसान मित्र",
    "farmer_mode": "किसान मोड",
    "pro_mode": "प्रो मोड",
    "language": "भाषा",

    // Input Form
    "step_1_title": "स्थान और मिट्टी",
    "state": "राज्य",
    "district": "ज़िला",
    "soil_type": "मिट्टी का प्रकार",
    "soil_ph": "मिट्टी का pH",
    "step_2_title": "संसाधन",
    "land_size": "ज़मीन (एकड़)",
    "water_available": "उपलब्ध पानी (लीटर)",
    "total_budget": "कुल बजट (₹)",
    "month": "बुवाई का महीना",
    "optimize_btn": "इंजन चलाएं",

    // Results Header
    "primary_recommendation": "मुख्य फ़सल",
    "best_crop": "सबसे अच्छी फ़सल",
    "expected_profit": "अनुमानित लाभ",
    "risk_level": "जोखिम स्तर",
    "water_use": "पानी का उपयोग",

    // ESG & Sustainability
    "esg_score": "स्थिरता स्कोर",
    "carbon_footprint": "कार्बन फुटप्रिंट",
    "groundwater": "भूजल प्रभाव",
    "organic_boost": "जैविक सुधार",
    "investor_ready": "निवेश के लिए तैयार",

    // Voice & Tech
    "voice_input": "बोलकर बताएं",
    "listening": "सुन रहा हूँ...",
    "voice_error": "समझ नहीं आया, फिर से बोलें",

    // Status / Messages
    "optimal": "बेहतरीन",
    "moderate": "मध्यम",
    "critical": "जोखिम भरा",
    "stable": "स्थिर",
    "excellent": "शानदार",

    // Additional Result Headers
    "subsidies": "वित्तीय सहायता (सब्सिडी)",
    "market_risk": "बाजार मूल्य जोखिम मीटर",
    "break_even": "ब्रेक-ईवन विश्लेषण",
    "soil_health": "मिट्टी का स्वास्थ्य और उर्वरक योजना",
    "climate_risk": "जलवायु लचीलापन और जोखिम",
    "credit_score_title": "किसान क्रेडिट और ऋण पात्रता",
    "mandi_connect": "मंडी और खरीदार कनेक्ट"
};

window.AgriData = {
    districtBlocks,
    stateDistricts,
    cropDatabase,
    indianStates,
    mandiHistoricalAverages,
    governmentSchemes,
    soilNutrients,
    historicalRainfall,
    apmcHubs,
    creditConstants,
    getSeason,
    ESG_CONSTANTS,
    HI_TRANSLATIONS
};

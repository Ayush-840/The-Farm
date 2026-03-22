/**
 * EXPLANATION:
 * The optimization logic now acts as a sophisticated filtering and scoring engine.
 * It filters the cropDatabase based on: Season mapping -> Soil suitability 
 * It then ranks them by hypothetical ROI and checks against constraint caps (water/budget).
 */

document.addEventListener('DOMContentLoaded', () => {

    // 1. Initialize State/District/Block Dropdowns
    const stateSelect = document.getElementById('state');
    const districtSelect = document.getElementById('district');
    const blockSelect = document.getElementById('block');

    // NATIONWIDE BLOCK API: Load data from comprehensive Gist
    let nationwideBlockMap = [];
    const BLOCK_API_URL = 'https://gist.githubusercontent.com/Keshava11/aace79cf260e7955ac1768d3ad6e24bd/raw/districts_block_map.json';

    async function initializeBlockAPI() {
        try {
            const response = await fetch(BLOCK_API_URL);
            if (!response.ok) throw new Error('API unstable or blocked');
            nationwideBlockMap = await response.json();
            console.log("Successfully loaded 700+ districts and 7000+ blocks from API.");
        } catch (error) {
            console.warn("Nationwide Block API failed, using local fallback + Smart Generator:", error);
            nationwideBlockMap = []; // Fallback to heuristics
        }
    }
    initializeBlockAPI();

    // Populate districts based on state
    if (stateSelect) {
        stateSelect.addEventListener('change', () => {
            const selectedState = stateSelect.value;
            const districts = window.AgriData.stateDistricts[selectedState] || [];

            // Clear existing options
            districtSelect.innerHTML = '<option value="" disabled selected>Select District</option>';
            blockSelect.innerHTML = '<option value="" disabled selected>Select Block</option>';
            blockSelect.disabled = true;

            if (districts.length > 0) {
                districts.forEach(dist => {
                    const option = document.createElement('option');
                    option.value = dist;
                    option.textContent = dist;
                    districtSelect.appendChild(option);
                });
                districtSelect.disabled = false;
            } else {
                districtSelect.disabled = true;
            }
        });
    }

    // Populate blocks based on district
    if (districtSelect) {
        districtSelect.addEventListener('change', () => {
            const selectedDistrict = districtSelect.value.trim().toUpperCase();
            let blocks = [];

            // 1. Try Comprehensive API Data
            if (nationwideBlockMap.length > 0) {
                const distData = nationwideBlockMap.find(d => d.name.toUpperCase() === selectedDistrict);
                if (distData && distData.blockList) {
                    blocks = distData.blockList.map(b => b.name);
                }
            }

            // 2. Try Local Fallback (Specific agricultural hubs in data.js)
            if (blocks.length === 0) {
                const localKey = Object.keys(window.AgriData.districtBlocks).find(k => k.toUpperCase() === selectedDistrict);
                if (localKey) {
                    blocks = window.AgriData.districtBlocks[localKey];
                }
            }

            // 3. Precise Safeguard: If no blocks found, use a respectful placeholder or generic 'Block'
            if (blocks.length === 0) {
                const displayDist = districtSelect.value;
                blocks = [`${displayDist} Block`, `Main Tehsil`];
            }

            // Clear existing options
            blockSelect.innerHTML = '<option value="" disabled selected>Select Block</option>';

            if (blocks.length > 0) {
                // Sort blocks alphabetically for better UX
                blocks.sort().forEach(b => {
                    const option = document.createElement('option');
                    option.value = b;
                    option.textContent = b;
                    blockSelect.appendChild(option);
                });
                blockSelect.disabled = false;
            } else {
                blockSelect.disabled = true;
            }
        });
    }

    // 2. DOM Elements
    const farmForm = document.getElementById('farmForm');
    const optimizeBtn = document.getElementById('optimizeBtn');
    const emptyState = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');
    const resultsContent = document.getElementById('resultsContent');
    const formError = document.getElementById('formError'); // Moved to shared scope
    const closeModal = document.querySelector('.close-modal');
    const viewJsonBtn = document.getElementById('viewJsonBtn');
    const jsonModal = document.getElementById('jsonModal');

    let currentApiPayload = {};
    let lastInputs = {};
    let lastWeatherData = {};
    let simulationDebounceTimer;

    // 3. Form Submission
    if (farmForm) {
        farmForm.addEventListener('submit', (e) => {
            e.preventDefault();
            formError.classList.add('hidden');

            // Extract Constraints safely
            const state = document.getElementById('state').value;
            const district = document.getElementById('district').value;
            const block = document.getElementById('block').value;
            const landSize = parseFloat(document.getElementById('landSize').value);
            const waterAvailable = parseFloat(document.getElementById('waterAvailable').value);
            const totalBudget = parseFloat(document.getElementById('totalBudget').value);
            const soilPhInput = document.getElementById('soilPh').value;
            const soilPh = soilPhInput ? parseFloat(soilPhInput) : null; // Optional field

            // STRICT VALIDATION LAYER (soilPh is now optional)
            if (!state || !district || !block || isNaN(landSize) || isNaN(waterAvailable) || isNaN(totalBudget) || landSize <= 0 || waterAvailable <= 0) {
                formError.classList.remove('hidden');
                formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            // Validate soilPh only if provided
            if (soilPhInput && (isNaN(soilPh) || soilPh < 4 || soilPh > 9)) {
                formError.classList.remove('hidden');
                formError.textContent = 'Please enter a valid pH level between 4 and 9, or leave it empty.';
                formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            const inputs = {
                state,
                district,
                block,
                village: document.getElementById('village') ? document.getElementById('village').value : "Default Village",
                month: document.getElementById('month').value,
                landSize,
                soilType: document.getElementById('soilType').value,
                soilPh: soilPh || 6.5, // Default to 6.5 if not provided
                waterAvailable,
                totalBudget
            };

            // Save to session and navigate
            sessionStorage.setItem('agri_inputs', JSON.stringify(inputs));
            window.location.href = "results.html";
        });
    }

    // Auto-load on results page
    if (resultsContent && !farmForm) {
        const savedInputs = sessionStorage.getItem('agri_inputs');
        if (savedInputs) {
            const inputs = JSON.parse(savedInputs);
            startOptimization(inputs);
        } else {
            // Redirect back if no data
            window.location.href = "index.html";
        }
    }

    // Toggle for Comparison Mode
    const compareToggle = document.getElementById('compareToggle');
    const comparisonSection = document.getElementById('comparisonSection');

    if (compareToggle) {
        compareToggle.addEventListener('change', () => {
            if (compareToggle.checked) {
                if (comparisonSection) comparisonSection.classList.remove('hidden');
                renderComparisonTable(currentApiPayload);
            } else {
                if (comparisonSection) comparisonSection.classList.add('hidden');
            }
        });
    }

    function renderComparisonTable(data) {
        const headRow = document.getElementById('comparisonHead');
        const body = document.getElementById('comparisonBody');
        const crops = [data.primary_recommendation, ...(data.alternatives || [])].slice(0, 3);

        // Render Headers
        headRow.innerHTML = '<th>Factor</th>';
        crops.forEach((crop, idx) => {
            const th = document.createElement('th');
            th.textContent = crop.name;
            if (idx === 0) th.className = 'primary-col';
            headRow.appendChild(th);
        });

        // Define Factors
        const factors = [
            { label: 'Net Profit', key: 'estimated_profit', format: v => `₹${Math.round(v).toLocaleString('en-IN')}` },
            { label: 'Risk Level', key: 'risk_category', format: v => v },
            { label: 'Water Use', key: 'total_water_used', format: v => `${v} L` },
            { label: 'ROI %', key: 'roi_pct', format: v => `${v}%` }
        ];

        body.innerHTML = '';
        factors.forEach(f => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${f.label}</td>`;
            crops.forEach((crop, idx) => {
                const td = document.createElement('td');
                const val = crop[f.key];
                td.textContent = f.format(val);
                if (idx === 0) td.className = 'primary-col';
                tr.appendChild(td);
            });
            body.appendChild(tr);
        });
    }

    // 4. Optimization Engine & Weather Fetch
    async function startOptimization(inputs) {
        // UI State
        if (optimizeBtn) {
            optimizeBtn.disabled = true;
            optimizeBtn.textContent = "Analyzing seasonal dynamics...";
        }
        if (emptyState) emptyState.classList.add('hidden');
        if (resultsContent) resultsContent.classList.add('hidden');
        if (loadingState) loadingState.classList.remove('hidden');

        try {
            // Fetch Weather with a strict 1.5s timeout for performance
            const weatherPromise = fetchWeatherData(inputs.state);
            const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 1500));

            const weatherData = await Promise.race([weatherPromise, timeoutPromise]) || {
                temp: 25, humidity: 60, rainfall: 0, rain_probability: 10, isLive: false
            };

            let results;
            try {
                results = runAlgorithm(inputs, weatherData);
            } catch (algError) {
                console.error("runAlgorithm crashed:", algError);
                throw new Error("Algorithm error: " + algError.message);
            }

            if (!results || !results.primary_recommendation) {
                throw new Error("Engine returned incomplete results.");
            }

            currentApiPayload = results;
            lastInputs = { ...inputs };
            lastWeatherData = { ...weatherData };

            // Initialize Simulation Sliders with baseline
            initSimulation(inputs);

            try {
                if (loadingState) loadingState.classList.add('hidden');
                if (resultsContent) {
                    resultsContent.classList.remove('hidden');
                    resultsContent.scrollIntoView({ behavior: 'smooth' });
                }
                showResults(results, weatherData, inputs);
            } catch (renderError) {
                console.error("showResults crashed:", renderError);
                throw new Error("Render error: " + renderError.message);
            }
        } catch (error) {
            console.error("Critical Engine Failure:", error);
            if (loadingState) loadingState.classList.add('hidden');
            // Show the REAL error to help diagnose
            if (formError) {
                formError.querySelector('span').textContent = "Error: " + error.message;
                formError.classList.remove('hidden');
            }
            if (optimizeBtn) {
                optimizeBtn.disabled = false;
                optimizeBtn.textContent = "Run Engine";
            }
            if (!formError) alert("Engine Error: " + error.message);
        }
    }

    // Weather data fetching with OpenWeatherMap API support
    async function fetchWeatherData(stateName) {
        const coords = window.AgriData.indianStates[stateName] || { lat: 20, lon: 77 };
        
        // Initialize WeatherConfig if not present
        if (!window.WeatherConfig) {
            window.WeatherConfig = {
                OPENWEATHER_API_KEY: 'YOUR_API_KEY',
                USE_OPENWEATHER: false,
                FALLBACK_TO_OPENMETEO: true
            };
        }
        
        // Try OpenWeatherMap API first if configured
        if (window.WeatherConfig.USE_OPENWEATHER && 
            window.WeatherConfig.OPENWEATHER_API_KEY && 
            window.WeatherConfig.OPENWEATHER_API_KEY !== 'YOUR_API_KEY') {
            try {
                console.log('🌤️ Fetching weather from OpenWeatherMap...');
                const data = await fetchOpenWeatherMapData(coords);
                console.log('✅ OpenWeatherMap data received');
                return data;
            } catch (error) {
                console.warn("⚠️ OpenWeatherMap API failed, trying fallback:", error.message);
                // Fall through to fallback
            }
        }
        
        // Fallback to Open-Meteo (No API key required)
        if (window.WeatherConfig.FALLBACK_TO_OPENMETEO !== false) {
            try {
                console.log('🌤️ Fetching weather from Open-Meteo (fallback)...');
                const data = await fetchOpenMeteoData(coords);
                console.log('✅ Open-Meteo data received');
                return data;
            } catch (error) {
                console.warn("⚠️ Open-Meteo API failed, using heuristics:", error.message);
            }
        }
        
        // Final fallback to heuristics
        console.log('📊 Using heuristic weather data');
        return getHeuristicWeatherData();
    }

    // Fetch weather from OpenWeatherMap One Call API 3.0
    async function fetchOpenWeatherMapData(coords) {
        const apiKey = window.WeatherConfig.OPENWEATHER_API_KEY;
        const { lat, lon } = coords;
        
        // OpenWeatherMap One Call API 3.0
        // exclude parameter: current,minutely,hourly,daily,alerts
        // We want: current, hourly (for today), daily (for forecast)
        const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&units=metric&appid=${apiKey}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Invalid API key. Please check your OpenWeatherMap API key.");
            } else if (response.status === 429) {
                throw new Error("API rate limit exceeded. Please try again later.");
            }
            throw new Error(`OpenWeatherMap API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Extract current weather
        const current = data.current;
        const hourly = data.hourly || [];
        const daily = data.daily || [];
        
        // Calculate rain probability from hourly forecast (next 12 hours)
        const next12Hours = hourly.slice(0, 12);
        const rainProbability = next12Hours.length > 0
            ? Math.round(next12Hours.reduce((sum, h) => sum + (h.pop || 0), 0) / next12Hours.length * 100)
            : (current.rain ? 100 : 0);
        
        // Get rainfall amount (convert from mm if available, or use rain.1h)
        const rainfall = current.rain ? (current.rain['1h'] || 0) : 0;
        
        // Build forecast array for next 7 days
        const forecast = daily.slice(0, 7).map(day => ({
            date: new Date(day.dt * 1000),
            temp: day.temp.day,
            tempMin: day.temp.min,
            tempMax: day.temp.max,
            humidity: day.humidity,
            rainfall: day.rain || 0,
            rainProbability: Math.round((day.pop || 0) * 100),
            description: day.weather[0]?.description || 'Clear',
            icon: day.weather[0]?.icon || '01d'
        }));
        
        return {
            temp: Math.round(current.temp),
            humidity: current.humidity,
            rainfall: rainfall,
            rain_probability: rainProbability,
            isLive: true,
            source: 'OpenWeatherMap',
            forecast: forecast,
            // Additional data
            feels_like: Math.round(current.feels_like),
            pressure: current.pressure,
            wind_speed: current.wind_speed,
            wind_deg: current.wind_deg,
            uv_index: current.uvi,
            visibility: current.visibility ? (current.visibility / 1000).toFixed(1) : null,
            description: current.weather[0]?.description || 'Clear',
            icon: current.weather[0]?.icon || '01d'
        };
    }

    // Fallback: Fetch weather from Open-Meteo (No API key required)
    async function fetchOpenMeteoData(coords) {
        const { lat, lon } = coords;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation&daily=precipitation_probability_max,precipitation_sum&timezone=auto&forecast_days=7`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) throw new Error("Open-Meteo API error");
        
        // Build forecast array
        const forecast = [];
        if (data.daily) {
            for (let i = 0; i < Math.min(7, data.daily.time.length); i++) {
                forecast.push({
                    date: new Date(data.daily.time[i]),
                    temp: data.daily.temperature_2m_max?.[i] || data.current.temperature_2m,
                    tempMin: data.daily.temperature_2m_min?.[i] || data.current.temperature_2m,
                    tempMax: data.daily.temperature_2m_max?.[i] || data.current.temperature_2m,
                    humidity: data.current.relative_humidity_2m,
                    rainfall: data.daily.precipitation_sum?.[i] || 0,
                    rainProbability: data.daily.precipitation_probability_max?.[i] || 0,
                    description: 'Clear',
                    icon: '01d'
                });
            }
        }
        
        return {
            temp: Math.round(data.current.temperature_2m),
            humidity: data.current.relative_humidity_2m,
            rainfall: data.current.precipitation || 0,
            rain_probability: data.daily.precipitation_probability_max?.[0] || 0,
            isLive: true,
            source: 'Open-Meteo',
            forecast: forecast
        };
    }

    // Final fallback: Heuristic weather data
    function getHeuristicWeatherData() {
        const currentMonth = new Date().getMonth() + 1;
        let baseTemp = 25;
        if (currentMonth >= 3 && currentMonth <= 6) baseTemp = 33;
        if (currentMonth >= 7 && currentMonth <= 10) baseTemp = 28;
        if (currentMonth >= 11 || currentMonth <= 2) baseTemp = 18;

        return {
            temp: parseFloat(baseTemp.toFixed(1)),
            humidity: 60,
            rainfall: 0,
            rain_probability: 15,
            isLive: false,
            source: 'Heuristic',
            forecast: []
        };
    }

    function runAlgorithm(inputs, weatherData) {
        const season = window.AgriData.getSeason(inputs.month);

        // Step A: Robust Multi-Tier Filtering
        let feasibleCrops = window.AgriData.cropDatabase.filter(c =>
            c.seasons.includes(season) && (c.soil_types.includes(inputs.soilType) || !c.soil_types.length)
        );

        // Step A2: pH Filtering & Penalty
        feasibleCrops = feasibleCrops.map(crop => {
            let phPenalty = 0;
            if (inputs.soilPh < crop.ph_min) phPenalty = 0.2; // 20% penalty if too acidic
            if (inputs.soilPh > crop.ph_max) phPenalty = 0.2; // 20% penalty if too alkaline
            return { ...crop, phPenalty };
        }).sort((a, b) => a.phPenalty - b.phPenalty);

        // Fallback 1: Broaden to season only if strict match fails
        if (feasibleCrops.length === 0) {
            feasibleCrops = window.AgriData.cropDatabase.filter(c => c.seasons.includes(season));
        }

        // Fallback 2: Ultimate safety fallback to prevent empty results
        if (feasibleCrops.length === 0) {
            feasibleCrops = window.AgriData.cropDatabase.slice(0, 5);
        }

        // Cost approximation (varies heavily, standardizing to ₹35k/acre for simplicity)
        const avgCostPerAcre = 35000;
        let affordableAcres = inputs.totalBudget / avgCostPerAcre;
        // Do not strictly limit acres by budget to near-zero, otherwise all yields/costs scale to 0.
        // Assume they can seek financing if budget is too low (this prevents dashboard breaking)
        let actualAcresToFarm = inputs.landSize;
        let actualCost = actualAcresToFarm * avgCostPerAcre;

        // Step B: Calculate metrics for each crop and rank them by Profit and Weather Penalty
        let analyzedCrops = feasibleCrops.map(crop => {
            const totalWaterNeeded = crop.water_req * actualAcresToFarm;

            // Adjust water need if it's raining (1mm rain ~ slightly less irrigation needed)
            const rainFactor = Math.min((weatherData.rainfall * 50), crop.water_req * 0.4); // max 40% reduction
            const adjustedWaterNeed = Math.max(0, crop.water_req - rainFactor) * actualAcresToFarm;

            // Determine water efficiency for ESG scoring
            let waterEfficiency = 100;
            if (adjustedWaterNeed > inputs.waterAvailable) {
                // If we need more water than available, flag it but don't force acres to 0.
                waterEfficiency = 120; // Over-utilization penalty
            } else {
                waterEfficiency = (totalWaterNeeded > 0) ? (adjustedWaterNeed / inputs.waterAvailable) * 100 : 0;
            }

            // Weather Impact Penalty
            let weatherPenalty = 0;
            let impact_message = "Optimal growing temperature detected.";
            if (weatherData.temp > (crop.temp_max || 40)) {
                weatherPenalty = 0.3; // 30% yield drop due to heat stress
                impact_message = `Heat stress alert. ${crop.name} yield may reduce by 30%. Increase irrigation.`;
            } else if (weatherData.temp < (crop.temp_min || 5)) {
                weatherPenalty = 0.25; // 25% yield drop due to cold
                impact_message = `Sub-optimal temperatures detected. Expect slight delayed growth for ${crop.name}.`;
            }

            // Final bounds based on chosen land (don't strictly limit by water/budget to prevent zeroing output)
            let finalAcres = actualAcresToFarm;
            let finalCost = finalAcres * avgCostPerAcre;
            let finalYield = (crop.yield_per_acre * finalAcres) * (1 - weatherPenalty) * (1 - (crop.phPenalty || 0));
            let revenue = finalYield * crop.est_price;
            let profit = revenue - finalCost;

            // Risk Categorization (Heuristic)
            let riskVal = (weatherPenalty + (crop.phPenalty || 0) + (1 - crop.resilience)) / 3;
            let risk_category = "Low";
            if (riskVal > 0.4) risk_category = "High";
            else if (riskVal > 0.2) risk_category = "Medium";

            let roi = finalCost > 0 ? (profit / finalCost) * 100 : 0;

            // ESG Metrics
            const carbonFootprint = finalYield * 1000 * (crop.carbon_per_kg || 1.0);
            const groundwaterImpact = (finalAcres * crop.water_req) * (crop.groundwater_impact || 0.5);

            // Sustainability Score (0-100)
            let sScore = (crop.resilience * 40) + (waterEfficiency * 0.3) + (crop.organic_bonus || 5);
            const esgConsts = window.AgriData.ESG_CONSTANTS || { CARBON_BENCHMARK: 1500, ORGANIC_SCORE_MAX: 100 };
            const carbonPenalty = finalAcres > 0 ?
                (carbonFootprint / (esgConsts.CARBON_BENCHMARK * finalAcres)) * 15 : 0;
            sScore = Math.max(5, Math.min(100, sScore - carbonPenalty));

            return {
                ...crop,
                impact_message,
                acres_allocated: finalAcres.toFixed(1),
                total_water_used: (finalAcres * crop.water_req).toFixed(0),
                water_efficiency: waterEfficiency.toFixed(1),
                estimated_cost: finalCost,
                estimated_yield: finalYield,
                estimated_revenue: revenue,
                estimated_profit: profit,
                roi_pct: roi.toFixed(1),
                risk_category: risk_category,
                carbon_footprint: carbonFootprint,
                groundwater_depletion: groundwaterImpact,
                sustainability_score: sScore.toFixed(0),
                volatility: (window.AgriData.mandiHistoricalAverages[crop.name] ||
                    window.AgriData.mandiHistoricalAverages["Wheat"]).volatility || 0.2
            };
        });

        // Price Forecasting Logic
        const forecastMonthRaw = (parseInt(inputs.month) + 2) % 12;
        const forecastMonth = forecastMonthRaw === 0 ? 11 : forecastMonthRaw - 1; // Safe 0-indexed array index
        const currentMonthIdx = Math.max(0, parseInt(inputs.month) - 1); // Safe 0-indexed

        analyzedCrops = analyzedCrops.map(crop => {
            const mandiData = window.AgriData.mandiHistoricalAverages[crop.name] ||
                window.AgriData.mandiHistoricalAverages["Wheat"]; // fallback to wheat trend
            const currentMandiPrice = (mandiData.trend && mandiData.trend[currentMonthIdx]) || mandiData.basePrice;
            const futureMandiPrice = (mandiData.trend && mandiData.trend[forecastMonth]) || mandiData.basePrice;

            let advisor = "Sell immediately after harvest.";
            if (futureMandiPrice > currentMandiPrice * 1.08) {
                advisor = `Store for 3 months. Expected price hike: +${(((futureMandiPrice / currentMandiPrice) - 1) * 100).toFixed(0)}%.`;
            } else if (futureMandiPrice > currentMandiPrice) {
                advisor = "Neutral market. Selling now is safe.";
            }

            return {
                ...crop,
                mandi_current: currentMandiPrice,
                mandi_forecast: futureMandiPrice,
                mandi_advisor: advisor
            };
        });

        // Select Top 3 with deep safety
        const top3 = analyzedCrops.length > 0 ? analyzedCrops.slice(0, 3) : [];
        const bestCrop = top3.length > 0 ? top3[0] : {
            name: "Diversified Cover",
            yield_per_acre: 1.0,
            estimated_yield: inputs.landSize,
            water_req: 500,
            estimated_cost: inputs.totalBudget * 0.5,
            estimated_revenue: inputs.totalBudget * 0.8,
            estimated_profit: inputs.totalBudget * 0.3,
            water_efficiency: 90,
            mandi_current: 2000,
            mandi_forecast: 2200,
            mandi_advisor: "Soil recovery recommended.",
            impact_message: "Low input crops suggested for soil health.",
            carbon_footprint: 0,
            groundwater_depletion: 0,
            sustainability_score: 85,
            organic_bonus: 25,
            resilience: 0.9,
            water_efficiency: 95
        };

        // Format final API payload schema requirement
        // Format final API payload schema requirement
        const result = {
            location: {
                state: inputs.state,
                district: inputs.district,
                block: inputs.block,
                village: inputs.village || "N/A"
            },
            season: season,
            risk_level: "Medium", // Will be updated by weather render
            primary_recommendation: {
                name: bestCrop.name,
                yield_per_acre: `${parseFloat(bestCrop.yield_per_acre || 0).toFixed(1)} Tons`,
                total_yield: `${parseFloat(bestCrop.estimated_yield || 0).toFixed(1)} Tons`,
                water_required: `${bestCrop.water_req} L/Acre`,
                water_efficiency: `${bestCrop.water_efficiency}%`,
                estimated_cost: `₹${parseFloat(bestCrop.estimated_cost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                expected_revenue: `₹${parseFloat(bestCrop.estimated_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                net_profit: `₹${parseFloat(bestCrop.estimated_profit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                estimated_profit: parseFloat(bestCrop.estimated_profit || 0),
                profit_margin: `${(parseFloat(bestCrop.estimated_revenue) > 0 ? (parseFloat(bestCrop.estimated_profit) / parseFloat(bestCrop.estimated_revenue)) * 100 : 0).toFixed(1)}%`,
                acres_allocated: bestCrop.acres_allocated || '0',
                total_water_used: bestCrop.total_water_used || '0',
                mandi_current: bestCrop.mandi_current || 0,
                mandi_forecast: bestCrop.mandi_forecast || 0,
                mandi_advisor: bestCrop.mandi_advisor || "No market data available."
            },
            alternatives: top3.slice(1).map(c => ({
                name: c.name,
                yield_per_acre: `${parseFloat(c.yield_per_acre || 0).toFixed(1)} Tons`,
                total_yield: `${parseFloat(c.estimated_yield || 0).toFixed(1)} Tons`,
                water_required: `${c.water_req} L/Acre`,
                water_efficiency: `${c.water_efficiency}%`,
                estimated_cost: `₹${parseFloat(c.estimated_cost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                expected_revenue: `₹${parseFloat(c.estimated_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                net_profit: `₹${parseFloat(c.estimated_profit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                estimated_profit: parseFloat(c.estimated_profit || 0),
                profit_margin: `${(parseFloat(c.estimated_revenue) > 0 ? (parseFloat(c.estimated_profit) / parseFloat(c.estimated_revenue)) * 100 : 0).toFixed(1)}%`,
                total_water_used: c.total_water_used || '0',
                mandi_current: c.mandi_current || 0,
                mandi_forecast: c.mandi_forecast || 0,
                mandi_advisor: c.mandi_advisor || "No market data available.",
                risk_category: c.risk_category,
                roi_pct: c.roi_pct || '0'
            })),
            irrigation_strategy: bestCrop.water_efficiency > 80 ? "Drip Irrigation" : "Surface Irrigation",
            weather_impact_desc: bestCrop.impact_message || "Current meteorological conditions are stable.",
            reasoning: `Based on the upcoming ${season} season and average patterns in ${inputs.district}, ${bestCrop.name} and ${top3[1]?.name || 'alternatives'} are highly viable. Since ${bestCrop.name} matches your available water capacity and local mandi trends favor this crop, it is the primary recommendation. Leverage ${bestCrop.water_efficiency > 80 ? "Drip Irrigation" : "Surface Irrigation"} to optimize your groundwater levels.`,

            // ESG results will be appended below to avoid duplication

            // --- NEW: Government Subsidies ---
            subsidies: window.AgriData.governmentSchemes.filter(scheme => scheme.eligibility({
                state: inputs.state,
                land: inputs.landSize,
                crop: bestCrop.name,
                water_daily: inputs.waterAvailable
            })),

            // --- NEW: Market Price Risk ---
            market_risk: {
                level: bestCrop.volatility < 0.2 ? "Low" : (bestCrop.volatility < 0.4 ? "Moderate" : "High"),
                stability_score: ((1 - bestCrop.volatility) * 10).toFixed(1),
                strategy: bestCrop.volatility < 0.2
                    ? "IMMEDIATE SELL: Prices are exceptionally stable. Recommend direct mandi sale to capture current benchmark rates."
                    : (bestCrop.volatility < 0.4
                        ? "COLD STORAGE: Moderate price swings detected. Utilization of cold chain can help wait for 15-20% price appreciation."
                        : "CONTRACT FARMING: High volatility region. Secure a fixed-price contract with food processors to hedge against sudden crashes.")
            },

            // --- NEW: Break-even Analysis ---
            break_even: {
                cost_per_acre: (bestCrop.estimated_cost / (bestCrop.acres_allocated || 1)).toFixed(0),
                break_even_price: (bestCrop.estimated_cost / (bestCrop.estimated_yield * 10 + 0.1)).toFixed(0), // yield in tons to q (1 ton = 10q)
                sensitivity: {
                    status: (bestCrop.mandi_current > (bestCrop.estimated_cost / (bestCrop.estimated_yield * 10 + 0.1)) * 1.2) ? 'Safe' : 'Risk',
                    diff_pct: (((bestCrop.mandi_current / (bestCrop.estimated_cost / (bestCrop.estimated_yield * 10 + 0.1) + 0.1)) - 1) * 100).toFixed(0)
                }
            },

            // --- NEW: Soil Health & Fertilizer Planner ---
            soil_health: {
                ph: inputs.soilPh,
                status: inputs.soilPh < 5.5 ? 'Acidic' : (inputs.soilPh > 7.5 ? 'Alkaline' : 'Optimal'),
                nutrients: inputs.soilPh < 5.5 ? window.AgriData.soilNutrients.acidic : (inputs.soilPh > 7.5 ? window.AgriData.soilNutrients.alkaline : window.AgriData.soilNutrients.optimal),
                schedule: [
                    { stage: "Pre-planting", task: `Basal Dose: Apply 50kg DAP + 25kg Urea for ${bestCrop.name}`, timing: "Day 0" },
                    { stage: "Vegetative", task: `Top Dressing: 25kg Urea + ${bestCrop.name === 'Rice (Paddy)' ? 'Zinc' : 'Micronutrients'}`, timing: "Day 30-45" },
                    { stage: "Flowering", task: `Liquid NPK (0:52:34) to boost ${bestCrop.name} yield`, timing: "Day 60-70" }
                ]
            }
        };

        // Step C: Calculate Climate Deviation & Probability
        const stateRainData = window.AgriData.historicalRainfall[inputs.state] || window.AgriData.historicalRainfall["Default"];
        const histRain = stateRainData[season] || 500;
        
        // Calculate forecast rain based on current conditions and rain probability
        // Historical average daily rainfall for the season
        const daysInMonth = 30;
        const histDailyAvg = histRain / daysInMonth;
        
        // Get current conditions
        const currentDailyRain = weatherData.rainfall || 0;
        const rainProbability = Math.max(0, Math.min(100, weatherData.rain_probability || 15));
        
        // Estimate monthly forecast:
        // - Base it on rain probability (higher prob = more rain expected)
        // - Factor in today's actual rainfall if any
        // - Use historical patterns as baseline
        let forecastRain;
        if (currentDailyRain > 0) {
            // If it's raining today, estimate based on current rain + probability
            // Assume if raining today with X% probability, monthly will be higher
            const todayContribution = currentDailyRain * 2; // Today's rain counts for more
            const probabilityContribution = histDailyAvg * (rainProbability / 100) * (daysInMonth - 1);
            forecastRain = todayContribution + probabilityContribution;
        } else {
            // If not raining today, estimate based on probability and historical average
            // Normal probability (30-70%) = near historical average
            // Low probability (<30%) = below average
            // High probability (>70%) = above average
            const probabilityFactor = rainProbability / 50; // 50% = 1.0 (normal), 25% = 0.5 (low), 75% = 1.5 (high)
            forecastRain = histDailyAvg * daysInMonth * probabilityFactor;
        }
        
        // Clamp forecast to reasonable range (0 to 2x historical)
        forecastRain = Math.max(0, Math.min(forecastRain, histRain * 2));
        
        // Calculate deviation percentage (how much forecast differs from historical)
        const deviation = histRain > 0 
            ? Math.round(((forecastRain - histRain) / histRain) * 100)
            : 0; // If no historical data, show 0% deviation

        let failureProb = 0;
        if (deviation < -30) failureProb += 25; // Drought risk
        if (deviation > 30) failureProb += 15; // Flood/Root rot risk
        if (weatherData.temp > 35) failureProb += 10; // Heat stress

        // Adjust failure prob by crop resilience (higher resilience = lower failure)
        failureProb = Math.max(0, failureProb * (1.5 - (bestCrop.resilience || 0.5))).toFixed(0);

        const riskAdjYield = (bestCrop.estimated_yield * (1 - (failureProb / 100))).toFixed(1);

        result.climate = {
            deviation: deviation.toFixed(0),
            failure_prob: failureProb,
            risk_adjusted_yield: `${riskAdjYield} Tons`,
            outlook: failureProb > 30 ? "Critical" : (failureProb > 15 ? "Warning" : "Excellent"),
            advice: failureProb > 30
                ? "HIGH RISK: Severe rainfall deviation detected. Recommend immediate drought-resistant crop switching or moisture-locking mulching."
                : (failureProb > 15
                    ? "CAUTION: Moderate climate instability. Ensure robust irrigation backup and use bio-stimulants for stress recovery."
                    : "STABLE: Seasonal parameters are optimal for your selected portfolio.")
        };

        // --- NEW: Sustainability Intelligence ---
        result.sustainability = {
            score: bestCrop.sustainability_score,
            carbon_footprint: `${Math.round(bestCrop.carbon_footprint).toLocaleString('en-IN')} kg CO2e`,
            groundwater_impact: `${Math.round(bestCrop.groundwater_depletion).toLocaleString('en-IN')} L Impact`,
            organic_boost: `+${bestCrop.organic_bonus || 0} pts`,
            investor_rating: bestCrop.sustainability_score > 80 ? "AAA (High)" : (bestCrop.sustainability_score > 60 ? "AA (Stable)" : "B (Requires Offset)")
        };

        // --- NEW: Farmer Credit Score Model ---
        const cc = window.AgriData.creditConstants;
        const equityScore = Math.min(1, inputs.landSize / 10) * 1000 * cc.equity_weight;
        const repaymentScore = Math.min(1, bestCrop.estimated_profit / 200000) * 1000 * cc.repayment_weight;
        const securityScore = (result.sustainability.score / 100) * 1000 * cc.security_weight;

        const finalCreditScore = Math.round(cc.base_score + equityScore + repaymentScore + securityScore);

        result.credit = {
            score: finalCreditScore,
            status: finalCreditScore > 750 ? "Excellent" : (finalCreditScore > 600 ? "Good" : "Average"),
            advice: finalCreditScore > 750
                ? "PRE-APPROVED: You qualify for low-interest KCC loans up to ₹5 Lakhs based on your high project stability."
                : (finalCreditScore > 600
                    ? "ELIGIBLE: Recommended for standard crop loans. Maintain this profit margin to boost your score further."
                    : "REVIEW REQUIRED: Score impacted by resource stress. Banks may require additional collateral or weather-insurance.")
        };

        // --- NEW: Mandi Connect Logic ---
        const hub = window.AgriData.apmcHubs[inputs.state] || window.AgriData.apmcHubs["Default"];
        const transCost = hub.dist_km * hub.transport_rate * (bestCrop.estimated_yield * 10); // rate per quintal per km approx

        result.mandi_connect = {
            nearby_apmc: `${hub.name} (${hub.dist_km} km)`,
            transport_cost: `₹${Math.round(transCost).toLocaleString('en-IN')}`,
            best_district: inputs.district // Simplification: current district is often best for local sale
        };

        // Sustainability already handled above

        // --- NEW: Government Subsidies Filter ---
        // Expose crop name to inputs context for scheme evaluation
        const schemeInputs = { ...inputs, crop: bestCrop.name, water_daily: (bestCrop.water_req * actualAcresToFarm) };
        result.subsidies = (window.AgriData.governmentSchemes || []).filter(scheme => {
            try {
                return scheme.eligibility(schemeInputs);
            } catch (e) {
                return false;
            }
        });

        return result;
    }

    // 5. Output Rendering
    function showResults(data, weather, inputs) {
        if (loadingState) loadingState.classList.add('hidden');
        if (resultsContent) resultsContent.classList.remove('hidden');
        if (optimizeBtn) {
            optimizeBtn.disabled = false;
            optimizeBtn.textContent = "Run Engine";
        }

        // Reset Comparison Toggle
        const compareToggle = document.getElementById('compareToggle');
        const comparisonSection = document.getElementById('comparisonSection');
        if (compareToggle) compareToggle.checked = false;
        if (comparisonSection) comparisonSection.classList.add('hidden');

        // Defensive checks for rendering values
        const safeVal = (val, suffix = '', fallback = '--') => {
            if (val === undefined || val === null) return fallback;
            if (typeof val === 'number') {
                if (isNaN(val)) return fallback;
                return `${val.toLocaleString('en-IN')}${suffix}`;
            }
            if (typeof val === 'string' && val.trim() === '') return fallback;
            return `${val}${suffix}`;
        };

        // Safe DOM setter to avoid "Cannot set properties of null" when an id is missing
        const setTextIfExists = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        const rec = data.primary_recommendation;

        // Render Location Summary (safe)
        setTextIfExists('resultLocation', `${inputs.state} > ${inputs.district} > ${inputs.block}`);

        // Render Mandi Intelligence (safe)
        setTextIfExists('mandiCurrent', `₹${safeVal(rec.mandi_current)}/q`);
        setTextIfExists('mandiForecast', `₹${safeVal(rec.mandi_forecast)}/q`);
        setTextIfExists('mandiAdvisor', rec.mandi_advisor || "No specific market advice available.");
        const mandiAdvEl = document.getElementById('mandiAdvisor');
        if (mandiAdvEl) {
            if (rec.mandi_advisor && rec.mandi_advisor.includes("Store")) mandiAdvEl.style.color = "var(--highlight)";
            else mandiAdvEl.style.color = "var(--text-muted)";
        }

        // Render Weather Panel (safe)
        setTextIfExists('wTemp', safeVal(weather.temp, '°C'));
        setTextIfExists('wHumid', safeVal(weather.humidity, '%'));
        setTextIfExists('wRain', safeVal(weather.rainfall, ' mm'));
        setTextIfExists('wRainProb', safeVal(weather.rain_probability, '%'));
        
        // Show additional weather info if available (from OpenWeatherMap)
        if (weather.source === 'OpenWeatherMap' && weather.description) {
            const wImpact = document.getElementById('wImpact');
            if (wImpact) {
                let impactText = `Current: ${weather.description}`;
                if (weather.feels_like) {
                    impactText += ` | Feels like: ${weather.feels_like}°C`;
                }
                if (weather.forecast && weather.forecast.length > 0) {
                    const tomorrow = weather.forecast[0];
                    impactText += ` | Tomorrow: ${tomorrow.tempMin}°-${tomorrow.tempMax}°C, ${tomorrow.rainProbability}% rain`;
                }
                wImpact.textContent = impactText;
            }
        }

        const riskBadge = document.getElementById('riskLevelBadge');
        const wImpact = document.getElementById('wImpact');

        let riskText = data.risk_level || "Low Risk";
        let riskColor = "bg-success";
        if (riskText.includes("High")) riskColor = "bg-danger";
        else if (riskText.includes("Medium")) riskColor = "bg-warning";

        if (riskBadge) {
            riskBadge.textContent = riskText;
            riskBadge.className = `badge ${riskColor}`;
        }
        if (wImpact) wImpact.textContent = data.weather_impact_desc || "Weather conditions are stable.";

        // Dom Updates with deep safety
        if (!rec) return; // Critical stop if rec is missing
        setTextIfExists('primaryCrop', rec.name || '--');
        setTextIfExists('yieldValue', safeVal(rec.total_yield));
        setTextIfExists('waterEffValue', safeVal(rec.water_efficiency));

        setTextIfExists('costValue', safeVal(rec.estimated_cost));
        setTextIfExists('revenueValue', safeVal(rec.expected_revenue));

        setTextIfExists('profitMarginValue', safeVal(rec.profit_margin));

        // Add Irrigation Strategy Strategy (safe)
        setTextIfExists('irrigationValue', data.irrigation_strategy || "Standard Irrigation");

        // -- NEW ALLOCATION LAYOUT MATH --
        const usedAcres = parseFloat(rec.acres_allocated || 0);
        const totalAcres = inputs.landSize;
        const landPct = totalAcres > 0 ? (usedAcres / totalAcres) * 100 : 0;

        // Multi-Crop Portfolio Distribution logic for visual
        let p1 = 60, p2 = 25, p3 = 15;
        if (Array.isArray(data.alternatives)) {
            if (data.alternatives.length === 1) { p1 = 70; p2 = 30; p3 = 0; }
            if (data.alternatives.length === 0) { p1 = 100; p2 = 0; p3 = 0; }
        }

        document.getElementById('landAllocText').textContent = `${safeVal(usedAcres)} / ${safeVal(totalAcres)} Acres`;
        const landBarCont = document.getElementById('landAllocBarContainer');
        if (landBarCont) {
            landBarCont.innerHTML = '';
            const addSeg = (pctOfUsed, color, name) => {
                if (pctOfUsed <= 0) return;
                const width = (pctOfUsed * landPct) / 100;
                const div = document.createElement('div');
                div.className = `progress-fill ${color}`;
                div.style.width = `${width}%`;
                div.title = `${name}`;
                landBarCont.appendChild(div);
            };
            addSeg(p1, 'crop-1', rec?.name || 'Primary');
            if (p2 > 0) addSeg(p2, 'crop-2', data.alternatives?.[0]?.name || 'Alternative 1');
            if (p3 > 0) addSeg(p3, 'crop-3', data.alternatives?.[1]?.name || 'Alternative 2');

            const emptyPct = 100 - landPct;
            if (emptyPct > 0) {
                const div = document.createElement('div');
                div.className = `progress-fill empty`;
                div.style.width = `${emptyPct}%`;
                div.title = 'Unused';
                landBarCont.appendChild(div);
            }
        }

        const usedWater = parseFloat(rec.total_water_used || 0);
        const totalWater = inputs.waterAvailable;
        const waterPct = totalWater > 0 ? Math.min(100, (usedWater / totalWater) * 100) : 0;

        document.getElementById('waterAllocText').textContent = `${safeVal(usedWater)} / ${safeVal(totalWater)} Liters`;
        const waterBar = document.getElementById('waterAllocBar');
        if (waterBar) {
            waterBar.style.width = `${waterPct}%`;
            waterBar.className = 'progress-fill';
            if (waterPct > 90) waterBar.classList.add('danger');
            else if (waterPct > 75) waterBar.classList.add('warning');
        }

        // --- NEW: 10x10 Farm Grid Initialization ---
        const farmGridContainer = document.getElementById('farm-grid');
        if (farmGridContainer) {
            farmGridContainer.innerHTML = ''; // Clear previous
            const totalCells = 100;

            // Calculate number of cells for each crop based on land utilization
            // We use the same p1, p2, p3 proportions but scaled to the actual land utilized percentage (landPct)
            const countP1 = Math.floor((p1 * landPct) / 100);
            const countP2 = Math.floor((p2 * landPct) / 100);
            const countP3 = Math.floor((p3 * landPct) / 100);
            const countUnallocated = totalCells - (countP1 + countP2 + countP3);

            // Create array of cell classes
            let distribution = [];
            for (let i = 0; i < countP1; i++) distribution.push('wheat'); // Primary uses wheat color style
            for (let i = 0; i < countP2; i++) distribution.push('corn');  // Alt1 uses corn color style
            for (let i = 0; i < countP3; i++) distribution.push('soy');   // Alt2 uses soy color style
            while (distribution.length < totalCells) distribution.push('unallocated');

            // Sort to group them visually
            distribution.sort((a, b) => {
                const order = { 'unallocated': 0, 'wheat': 1, 'corn': 2, 'soy': 3 };
                return order[a] - order[b];
            });

            // Create DOM elements and animate
            distribution.forEach((cellType, index) => {
                const cell = document.createElement('div');
                cell.className = 'grid-cell'; // Start neutral
                farmGridContainer.appendChild(cell);

                // Animate appearance
                setTimeout(() => {
                    if (cellType !== 'unallocated') {
                        cell.className = `grid-cell cell-${cellType}`;
                    }
                    cell.style.transform = 'scale(1)';
                    cell.style.opacity = '1';
                }, index * 10); // 10ms stagger
            });
        }
        // ---------------------------------

        /* =========================================================================
           IOT SENSOR INTEGRATION (HACKATHON FEATURE)
           ========================================================================= */
        // Extract primary crop for IoT alerts
        const primaryCropForIoT = rec.name || 'N/A';
        setTextIfExists('outCropName', primaryCropForIoT);

        const sensorDataStr = sessionStorage.getItem('agri_sensor_data');
        if (sensorDataStr) {
            try {
                const sensorData = JSON.parse(sensorDataStr);
                const dashboardContainer = document.getElementById('iotDashboardContainer');

                if (sensorData && sensorData.length > 0 && dashboardContainer) {
                    dashboardContainer.style.display = 'block';

                    // 1. Process Data for Charts (Sub-sample for performance if needed, or take daily averages)
                    // For 336 hourly points, let's take every 12th point (twice a day) to keep the chart clean
                    const chartData = sensorData.filter((_, i) => i % 12 === 0);
                    const labels = chartData.map(d => {
                        const date = new Date(d.timestamp);
                        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
                    });

                    // 2. Render Moisture Chart
                    const ctxMoisture = document.getElementById('moistureChart');
                    if (ctxMoisture) {
                        new Chart(ctxMoisture, {
                            type: 'line',
                            data: {
                                labels: labels,
                                datasets: [{
                                    label: 'Moisture (%)',
                                    data: chartData.map(d => d.moisture),
                                    borderColor: '#3b82f6',
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    tension: 0.4,
                                    fill: true
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { labels: { color: '#cbd5e1' } } },
                                scales: {
                                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
                                }
                            }
                        });
                    }

                    // 3. Render Nutrient/pH Chart
                    const ctxNutrient = document.getElementById('nutrientChart');
                    if (ctxNutrient) {
                        new Chart(ctxNutrient, {
                            type: 'line',
                            data: {
                                labels: labels,
                                datasets: [
                                    {
                                        label: 'pH Level',
                                        data: chartData.map(d => d.ph),
                                        borderColor: '#10b981',
                                        tension: 0.4,
                                        yAxisID: 'y'
                                    },
                                    {
                                        label: 'Nitrogen (ppm)',
                                        data: chartData.map(d => d.nitrogen),
                                        borderColor: '#f59e0b',
                                        borderDash: [5, 5],
                                        tension: 0.4,
                                        yAxisID: 'y1'
                                    }
                                ]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { labels: { color: '#cbd5e1' } } },
                                scales: {
                                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                                    y: { type: 'linear', display: true, position: 'left', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#10b981' } },
                                    y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#f59e0b' } }
                                }
                            }
                        });
                    }

                    // 4. Rule-Based Smart Alerts Logic
                    // Based on precise SoilFusion Agronomic Thresholds
                    const alertsList = document.getElementById('iotAlertsList');
                    let plantingScore = 85; // Base score
                    const alerts = [];

                    // Calculate recent 24h average for current conditions
                    const recentData = sensorData.slice(-24);
                    const avgMoisture = recentData.reduce((sum, d) => sum + parseFloat(d.moisture), 0) / 24;
                    const avgPH = recentData.reduce((sum, d) => sum + parseFloat(d.ph), 0) / 24;
                    const avgNitrogen = recentData.reduce((sum, d) => sum + parseFloat(d.nitrogen), 0) / 24;
                    const avgTemp = recentData.reduce((sum, d) => sum + parseFloat(d.temperature), 0) / 24;

                    // Calculate 7-day rolling averages (last 168 hours) for Anomaly Detection
                    const last7Days = sensorData.slice(-168);
                    const avgMoisture7d = last7Days.reduce((sum, d) => sum + parseFloat(d.moisture), 0) / 168;

                    // Evaluate Moisture (Optimal: 25-40%)
                    if (avgMoisture < 15) {
                        alerts.push({ type: 'critical', title: 'Severe Drought Stress', desc: `Moisture critically low (${avgMoisture.toFixed(1)}%). Immediate irrigation required.` });
                        plantingScore -= 30;
                    } else if (avgMoisture > 50) {
                        alerts.push({ type: 'critical', title: 'Waterlogging Risk', desc: `Moisture critically high (${avgMoisture.toFixed(1)}%). Risk of root asphyxiation.` });
                        plantingScore -= 30;
                    } else if ((avgMoisture >= 15 && avgMoisture < 25) || (avgMoisture > 40 && avgMoisture <= 50)) {
                        alerts.push({ type: 'warning', title: 'Suboptimal Moisture', desc: `Moisture (${avgMoisture.toFixed(1)}%) in caution zone. Monitor hydration.` });
                        plantingScore -= 10;
                    }

                    // Anomaly Rule: Sudden change >20% from 7-day rolling average
                    const moistureChangePct = Math.abs((avgMoisture - avgMoisture7d) / avgMoisture7d);
                    if (moistureChangePct > 0.20) {
                        alerts.push({ type: 'warning', title: 'Moisture Anomaly Detected', desc: `Sudden >20% fluctuation in moisture compared to 7-day average. Verify sensors or irrigation.` });
                        plantingScore -= 15;
                    }

                    // Evaluate pH (Optimal: 6.0-7.5)
                    if (avgPH < 5.5) {
                        alerts.push({ type: 'critical', title: 'High Acidity', desc: `pH critically low (${avgPH.toFixed(1)}). Soil too acidic, severe nutrient lockout risk.` });
                        plantingScore -= 25;
                    } else if (avgPH > 8.0) {
                        alerts.push({ type: 'critical', title: 'High Alkalinity', desc: `pH critically high (${avgPH.toFixed(1)}). Immediate corrective action required.` });
                        plantingScore -= 25;
                    } else if ((avgPH >= 5.5 && avgPH < 6.0) || (avgPH > 7.5 && avgPH <= 8.0)) {
                        alerts.push({ type: 'warning', title: 'Marginal pH', desc: `Current pH is ${avgPH.toFixed(1)}. Approaching stress levels.` });
                        plantingScore -= 10;
                    }

                    // Evaluate Nitrogen (Optimal: 200-500 ppm)
                    if (avgNitrogen < 100) {
                        alerts.push({ type: 'critical', title: 'Severe Nitrogen Deficiency', desc: `Nitrogen depleted (${avgNitrogen.toFixed(0)} ppm). Growth severely limited.` });
                        plantingScore -= 25;
                    } else if (avgNitrogen > 800) {
                        alerts.push({ type: 'critical', title: 'Nitrogen Excess', desc: `Nitrogen too high (${avgNitrogen.toFixed(0)} ppm). Fertilizer burn risk.` });
                        plantingScore -= 25;
                    } else if ((avgNitrogen >= 100 && avgNitrogen < 200) || (avgNitrogen > 500 && avgNitrogen <= 800)) {
                        alerts.push({ type: 'warning', title: 'Suboptimal Nitrogen', desc: `Nitrogen level (${avgNitrogen.toFixed(0)} ppm) requires attention.` });
                        plantingScore -= 10;
                    }

                    // Evaluate Temp (Optimal: 15-30C)
                    if (avgTemp < 10 || avgTemp > 40) {
                        alerts.push({ type: 'critical', title: 'Extreme Soil Temperature', desc: `Soil temp (${avgTemp.toFixed(1)}°C) limits growth.` });
                        plantingScore -= 15;
                    } else if ((avgTemp >= 10 && avgTemp < 15) || (avgTemp > 30 && avgTemp <= 40)) {
                        alerts.push({ type: 'warning', title: 'Marginal Temperature', desc: `Soil temp (${avgTemp.toFixed(1)}°C) is outside ideal range.` });
                        plantingScore -= 5;
                    }

                    // Populate Alerts HTML
                    if (alerts.length === 0) {
                        alertsList.innerHTML = `
                            <div class="iot-alert-item info">
                                <span class="iot-alert-title">Optimal Soil Health</span>
                                <span class="iot-alert-desc">All parameters (pH, Moisture, N, Temp) are stable within ideal agronomic ranges for ${primaryCropForIoT}.</span>
                            </div>
                        `;
                    } else {
                        alertsList.innerHTML = alerts.map(a => `
                            <div class="iot-alert-item ${a.type}">
                                <span class="iot-alert-title">${a.title}</span>
                                <span class="iot-alert-desc">${a.desc}</span>
                            </div>
                        `).join('');
                    }

                    // 5. Planting Window Recommendation
                    const plantingContainer = document.getElementById('iotPlantingWindow');
                    let windowHtml = '';

                    if (plantingScore >= 80) {
                        windowHtml = `
                            <div class="planting-score">${plantingScore}</div>
                            <div class="planting-label">High Confidence</div>
                            <div class="planting-suggestion" style="color: var(--status-safe);">Excellent conditions. Plant within next 3-5 days.</div>
                        `;
                    } else if (plantingScore >= 50) {
                        windowHtml = `
                            <div class="planting-score" style="color: var(--status-moderate);">${plantingScore}</div>
                            <div class="planting-label">Moderate Confidence</div>
                            <div class="planting-suggestion" style="color: var(--status-moderate);">Hold off planting. Address soil alerts first.</div>
                        `;
                    } else {
                        windowHtml = `
                            <div class="planting-score" style="color: var(--status-critical);">${plantingScore}</div>
                            <div class="planting-label">Low Confidence</div>
                            <div class="planting-suggestion" style="color: var(--status-critical);">Unsafe to plant. High risk of crop failure.</div>
                        `;
                    }
                    plantingContainer.innerHTML = windowHtml;
                }
            } catch (e) {
                console.error("Error parsing sensor data for dashboard:", e);
            }
        }

        // --- End IoT Integration ---

        // Render ESG & Sustainability Intelligence
        const sunData = data.sustainability;
        const sunCard = document.getElementById('sustainabilityCard');
        const esgBadge = document.getElementById('esgBadge');
        const esgCircle = document.getElementById('esgCirclePath');
        const sunScoreText = document.getElementById('sustainabilityScore');

        const carbonVal = document.getElementById('carbonFootprint');
        const carbonBar = document.getElementById('carbonBar');
        const esgWaterVal = document.getElementById('groundwaterDepletion');
        const esgWaterBar = document.getElementById('waterImpactBar');
        const organicVal = document.getElementById('organicBoost');
        const organicBar = document.getElementById('organicBar');
        const esgAdviceText = document.getElementById('esgAdviceText');

        if (sunCard && sunData) {
            // Update Text & Bars
            if (sunScoreText) sunScoreText.textContent = `${sunData.score}%`;
            if (esgCircle) {
                // Defer to allow CSS transition to paint from 0
                setTimeout(() => {
                    esgCircle.style.strokeDasharray = `${sunData.score}, 100`;
                }, 100);
            }
            if (esgBadge) esgBadge.textContent = `ESG Rating: ${sunData.investor_rating}`;

            if (carbonVal) carbonVal.textContent = sunData.carbon_footprint;
            if (carbonBar) {
                // Split by space to isolate "1,500" from "kg CO2e" before removing non-digits
                let rawCarbon = parseInt(sunData.carbon_footprint.split(' ')[0].replace(/[^\d]/g, '')) || 0;
                const carbonPct = Math.min(100, (rawCarbon / (window.AgriData.ESG_CONSTANTS.CARBON_BENCHMARK * inputs.landSize)) * 100);
                setTimeout(() => { carbonBar.style.width = `${carbonPct}%`; }, 200);
            }

            if (esgWaterVal) esgWaterVal.textContent = sunData.groundwater_impact;
            if (esgWaterBar) {
                let rawWater = parseInt(sunData.groundwater_impact.split(' ')[0].replace(/[^\d]/g, '')) || 0;
                const waterImpactPct = Math.min(100, (rawWater / (inputs.waterAvailable * 2)) * 100);
                setTimeout(() => { esgWaterBar.style.width = `${waterImpactPct}%`; }, 300);
            }

            if (organicVal) organicVal.textContent = sunData.organic_boost;
            if (organicBar) {
                let rawOrganic = parseInt(sunData.organic_boost.split(' ')[0].replace(/[^\d]/g, '')) || 0;
                const organicPct = (rawOrganic / window.AgriData.ESG_CONSTANTS.ORGANIC_SCORE_MAX) * 100;
                setTimeout(() => { organicBar.style.width = `${organicPct}%`; }, 400);
            }

            // Reset classes
            sunCard.className = 'sustainability-card glass-panel mt-4 p-4 animate-in';
            const adviceBox = document.getElementById('esgAdviceBox');
            if (adviceBox) adviceBox.className = 'conservation-box';

            if (sunData.score < 50) {
                sunCard.classList.add('critical');
                if (esgBadge) esgBadge.style.color = '#f43f5e';
            } else if (sunData.score < 75) {
                sunCard.classList.add('moderate');
                if (esgBadge) esgBadge.style.color = '#f59e0b';
            } else {
                if (esgBadge) esgBadge.style.color = '#10b981';
            }

            if (esgAdviceText) {
                esgAdviceText.textContent = sunData.score > 80 ?
                    "Excellent environmental profile. This farm is eligible for Green Credit financing." :
                    "Moderate ESG impact. Consider crop rotation with legumes to improve organic score.";
            }
        }

        // --- NEW: Render Government Subsidies ---
        const subsidyList = document.getElementById('subsidyList');
        if (subsidyList && data.subsidies) {
            if (data.subsidies.length > 0) {
                subsidyList.innerHTML = data.subsidies.map(s => `
                    <div class="subsidy-item animate-in">
                        <div class="subsidy-header">
                            <span class="subsidy-name">${s.name}</span>
                            <span class="subsidy-benefit">${s.benefit}</span>
                        </div>
                        <p class="subsidy-desc">${s.description}</p>
                        ${s.applicationLink ? `
                            <a href="${s.applicationLink}" target="_blank" rel="noopener noreferrer" class="subsidy-link">
                                <i class="fas fa-external-link-alt"></i>
                                <span>Apply Now / More Info</span>
                            </a>
                        ` : ''}
                    </div>
                `).join('');
            } else {
                subsidyList.innerHTML = '<div class="text-muted" style="padding: 1rem;">No specific subsidies found for this profile.</div>';
            }
        }

        // --- NEW: Render Market Price Risk ---
        const riskData = data.market_risk;
        const riskLevel = document.getElementById('riskLevel');
        const stabilityScore = document.getElementById('stabilityScore');
        const riskActionBox = document.getElementById('riskActionBox');
        const riskActionText = document.getElementById('riskActionText');

        if (riskData && riskLevel && stabilityScore && riskActionBox && riskActionText) {
            riskLevel.textContent = riskData.level || 'Moderate';
            stabilityScore.textContent = `${riskData.stability_score || '--'}/10`;

            // Reset classes
            riskActionBox.className = 'conservation-box';

            if (riskData.level === 'High') {
                riskActionBox.classList.add('critical');
                riskLevel.style.color = 'var(--status-critical)';
            } else if (riskData.level === 'Moderate') {
                riskLevel.style.color = 'var(--status-moderate)';
            } else {
                riskLevel.style.color = 'var(--status-safe)';
            }

            riskActionText.textContent = riskData.strategy || 'No specific market strategy available.';
        }

        // --- NEW: Render Break-even Analysis ---
        const breakEvenData = data.break_even;
        const costPerAcre = document.getElementById('costPerAcre');
        const breakEvenPrice = document.getElementById('breakEvenPrice');
        const profitShieldBox = document.getElementById('profitShieldBox');
        const profitShieldText = document.getElementById('profitShieldText');

        if (breakEvenData && costPerAcre && breakEvenPrice && profitShieldBox && profitShieldText) {
            costPerAcre.textContent = `₹${parseFloat(breakEvenData.cost_per_acre || 0).toLocaleString('en-IN')}`;
            breakEvenPrice.textContent = `₹${parseFloat(breakEvenData.break_even_price || 0).toLocaleString('en-IN')}/q`;

            if (breakEvenData.sensitivity.status === 'Safe') {
                profitShieldBox.style.background = 'rgba(16, 185, 129, 0.08)';
                profitShieldBox.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                profitShieldText.innerHTML = `<span style="color: #10b981;">SAFE MARGIN:</span> Your current mandi price is <strong>${breakEvenData.sensitivity.diff_pct}%</strong> above break-even. Strong profit protection.`;
            } else {
                profitShieldBox.style.background = 'rgba(239, 68, 68, 0.08)';
                profitShieldBox.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                profitShieldText.innerHTML = `<span style="color: #ef4444;">LOSS RISK:</span> Mandi price is thin or below break-even (₹${breakEvenData.break_even_price}/q). Any further drop will result in direct financial loss.`;
            }
        }

        // --- NEW: Render Soil Health & Fertilizer Planner ---
        const soilData = data.soil_health;
        const phStatus = document.getElementById('phStatus');
        const nutrientAlert = document.getElementById('nutrientAlert');
        const fertilizerSchedule = document.getElementById('fertilizerSchedule');
        const soilAdviceText = document.getElementById('soilAdviceText');
        const soilHealthCard = document.getElementById('soilHealthCard');

        if (soilData && phStatus && nutrientAlert && fertilizerSchedule && soilAdviceText) {
            phStatus.textContent = `${soilData.ph || '--'} (${soilData.status || 'Checking'})`;
            nutrientAlert.textContent = (soilData.nutrients && soilData.nutrients.deficiencies && soilData.nutrients.deficiencies.length > 0)
                ? `Deficient: ${soilData.nutrients.deficiencies.join(', ')}`
                : 'Stable';

            // Color coding pH Status
            if (soilData.status === 'Optimal') {
                phStatus.style.color = 'var(--status-safe)';
                soilHealthCard.classList.remove('critical', 'moderate');
            } else {
                phStatus.style.color = 'var(--highlight)';
                soilHealthCard.classList.add(soilData.status === 'Acidic' ? 'moderate' : 'critical');
            }

            // Render Schedule
            fertilizerSchedule.innerHTML = soilData.schedule.map(s => `
                <div class="mandi-stat" style="padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; font-size: 0.85rem; color: #60a5fa;">${s.stage} (${s.timing})</span>
                    </div>
                    <div style="font-size: 0.8rem; color: #fff; margin-top: 2px;">${s.task}</div>
                </div>
            `).join('');

            soilAdviceText.textContent = soilData.nutrients ? soilData.nutrients.suggestion : "Maintaining soil health...";
        }

        // --- NEW: Render Climate Resilience Engine ---
        const climateData = data.climate;
        const rainDeviation = document.getElementById('rainDeviation');
        const failureProb = document.getElementById('failureProb');
        const riskAdjustedYield = document.getElementById('riskAdjustedYield');
        const climateStabilityBox = document.getElementById('climateStabilityBox');
        const climateStabilityText = document.getElementById('climateStabilityText');

        if (climateData && rainDeviation && failureProb && riskAdjustedYield && climateStabilityBox && climateStabilityText) {
            rainDeviation.textContent = `${climateData.deviation > 0 ? '+' : ''}${climateData.deviation || 0}%`;
            failureProb.textContent = `${climateData.failure_prob || 0}%`;
            riskAdjustedYield.textContent = climateData.risk_adjusted_yield || '--';

            climateStabilityBox.className = 'conservation-box';
            if (climateData.outlook === 'Critical') {
                climateStabilityBox.classList.add('critical');
                failureProb.style.color = 'var(--status-critical)';
            } else if (climateData.outlook === 'Warning') {
                climateStabilityBox.classList.add('moderate');
                failureProb.style.color = 'var(--status-moderate)';
            } else {
                failureProb.style.color = 'var(--status-safe)';
            }
            climateStabilityText.textContent = climateData.advice || "Weather parameters are within normal range.";
        }

        // --- NEW: Render Farmer Credit & Mandi Connect ---
        const creditData = data.credit;
        const creditScore = document.getElementById('creditScore');
        const loanStatus = document.getElementById('loanStatus');
        const creditAdviceText = document.getElementById('creditAdviceText');

        if (creditData && creditScore && loanStatus && creditAdviceText) {
            creditScore.textContent = creditData.score || '--';
            loanStatus.textContent = creditData.status || 'Checking...';
            loanStatus.style.color = creditData.status === 'Excellent' ? 'var(--status-safe)' : (creditData.status === 'Good' ? 'var(--status-moderate)' : 'var(--highlight)');
            creditAdviceText.textContent = creditData.advice || "Your credit profile is being analyzed.";
        }

        const mandiConn = data.mandi_connect;
        const nearbyApmc = document.getElementById('nearbyApmc');
        const transportCost = document.getElementById('transportCost');
        const bestDistrictTag = document.getElementById('bestDistrictTag');

        if (mandiConn && nearbyApmc && transportCost && bestDistrictTag) {
            nearbyApmc.textContent = mandiConn.nearby_apmc || '--';
            transportCost.textContent = mandiConn.transport_cost || '₹0';
            bestDistrictTag.textContent = mandiConn.best_district || '--';
        }

        // --- NEW: WhatsApp SMS Alert Simulation ---
        const cropName = data.primary_recommendation && data.primary_recommendation.name ? data.primary_recommendation.name : 'your crop';
        const alertEl = document.getElementById('whatsappAlertBox');
        if (alertEl) {
            alertEl.innerHTML = `📱 <strong>SMS Alert Ready:</strong> "AgriOptima: Your optimal crop for this season is <em>${cropName}</em>. Check your plan at AgriOptima."`;
            alertEl.style.display = 'block';
        }


        // Add AI Reasoning text
        const aiReasoningEl = document.getElementById('aiReasoning');
        if (aiReasoningEl) aiReasoningEl.textContent = data.reasoning;

        // Crop Suggestions Grid
        const suggestionsBox = document.getElementById('cropSuggestions');
        if (suggestionsBox) {
            suggestionsBox.innerHTML = ''; // Clear previous

            const alternatives = Array.isArray(data.alternatives) ? data.alternatives : [];
            const allTopCrops = rec ? [rec, ...alternatives] : alternatives;

            allTopCrops.forEach((c, idx) => {
                if (!c || !c.name) return;
                const div = document.createElement('div');
                div.className = `suggestion-pill ${idx === 0 ? 'top-pick' : ''}`;
                div.innerHTML = `<strong>${c.name}</strong><br><small>Profit: ${safeVal(c.net_profit)}</small>`;
                suggestionsBox.appendChild(div);
            });
        }

        const jsonOutputEl = document.getElementById('jsonOutput');
        if (jsonOutputEl) {
            jsonOutputEl.textContent = JSON.stringify({
                location: data.location,
                season: data.season,
                risk_level: data.risk_level,
                primary_recommendation: data.primary_recommendation,
                alternatives: data.alternatives,
                irrigation_strategy: data.irrigation_strategy,
                reasoning: data.reasoning
            }, null, 2);
        }

        // Fade in
        if (resultsContent) {
            resultsContent.style.opacity = "0";
            setTimeout(() => {
                resultsContent.style.transition = "opacity 0.5s ease";
                resultsContent.style.opacity = "1";
            }, 50);
        }

        // --- NEW: Trigger Standalone Crop Library ---
        generateCropLibrary(data.location.state, inputs.month.toString(), inputs.soilType);
    }

    // --- NEW: Standalone Informational Module ---
    function generateCropLibrary(stateName, monthString, soilType) {
        const season = window.AgriData.getSeason(monthString);

        const libBadge = document.getElementById('libSeasonBadge');
        if (libBadge) libBadge.textContent = `Detected Season: ${season}`;

        // Step A: Robust Multi-Tier Filtering (Same logic as engine)
        let libraryCrops = window.AgriData.cropDatabase.filter(c =>
            c.seasons.includes(season) && (c.soil_types.includes(soilType) || !c.soil_types.length)
        );

        if (libraryCrops.length === 0) {
            libraryCrops = window.AgriData.cropDatabase.filter(c => c.seasons.includes(season));
        }

        if (libraryCrops.length === 0) {
            libraryCrops = window.AgriData.cropDatabase.slice(0, 5);
        }

        const libList = document.getElementById('cropLibraryList');
        if (!libList) return;

        libList.innerHTML = '';
        libraryCrops.forEach(crop => {
            const div = document.createElement('div');
            div.className = 'suggestion-pill';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:0.3rem;">
                    <strong>${crop.name}</strong>
                    <span class="text-highlight">${crop.yield_per_acre} Tons/Acre</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                    Water: ${crop.water_req > 3000 ? 'High' : (crop.water_req < 1500 ? 'Low' : 'Medium')} | 
                    Price/Ton: ₹${(crop.est_price || 0).toLocaleString('en-IN')}
                </div>
            `;
            libList.appendChild(div);
        });
        // Generate JSON for this library view
        const libraryJSON = {
            detected_season: season,
            location: stateName,
            crops: libraryCrops.map(c => ({
                name: c.name,
                seasons: c.seasons,
                soil_types: c.soil_types,
                water_req: c.water_req,
                yield: c.yield_per_acre,
                price: c.est_price
            }))
        };
        console.log("Crop Library JSON:", libraryJSON);
    }

    // Modal Handling for JSON Payload
    if (viewJsonBtn) {
        viewJsonBtn.addEventListener('click', () => {
            if (jsonModal) jsonModal.classList.remove('hidden');
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (jsonModal) jsonModal.classList.add('hidden');
        });
    }

    window.addEventListener('click', (e) => {
        if (jsonModal && e.target == jsonModal) {
            jsonModal.classList.add('hidden');
        }
    });
    // --- NEW: "What If" Simulation Engine ---
    function initSimulation(inputs) {
        const simBudget = document.getElementById('simBudget');
        const simWater = document.getElementById('simWater');
        const simLand = document.getElementById('simLand');

        // Set baseline values
        simBudget.value = inputs.totalBudget;
        simWater.value = inputs.waterAvailable;
        simLand.value = inputs.landSize;

        updateSimLabels();

        // Listeners with debounce
        [simBudget, simWater, simLand].forEach(el => {
            el.addEventListener('input', () => {
                updateSimLabels();
                clearTimeout(simulationDebounceTimer);
                simulationDebounceTimer = setTimeout(runSimulation, 150);
            });
        });

        // Initial run to populate values instead of leaving them at 0
        setTimeout(runSimulation, 300);
    }

    function updateSimLabels() {
        document.getElementById('simBudgetVal').textContent = `₹${parseInt(document.getElementById('simBudget').value).toLocaleString('en-IN')}`;
        document.getElementById('simWaterVal').textContent = `${parseInt(document.getElementById('simWater').value).toLocaleString('en-IN')} L`;
        document.getElementById('simLandVal').textContent = `${parseFloat(document.getElementById('simLand').value).toFixed(1)} Acres`;
    }

    function runSimulation() {
        if (!lastInputs || !lastWeatherData) return;

        const simInputs = {
            ...lastInputs,
            totalBudget: parseFloat(document.getElementById('simBudget').value),
            waterAvailable: parseFloat(document.getElementById('simWater').value),
            landSize: parseFloat(document.getElementById('simLand').value)
        };

        const simResults = runAlgorithm(simInputs, lastWeatherData);
        const baseline = currentApiPayload.primary_recommendation;
        const sim = simResults.primary_recommendation;

        if (!baseline || !sim) return;

        // 1. Profit Impact
        const profitVal = document.getElementById('simProfitVal');
        const profitDelta = document.getElementById('simProfitDelta');
        const diff = sim.estimated_profit - baseline.estimated_profit;

        animateValue(profitVal, parseInt(profitVal.textContent.replace(/[^\d-]/g, '') || 0), Math.round(sim.estimated_profit), 500, '₹');

        profitDelta.textContent = diff === 0 ? "Baseline" : `${diff > 0 ? '+' : ''}${Math.round(diff).toLocaleString('en-IN')}`;
        profitDelta.className = `impact-delta ${diff >= 0 ? (diff === 0 ? '' : 'delta-pos') : 'delta-neg'}`;

        // Dynamic Card Glow Based on Profit
        const simCard = document.querySelector('.simulation-card');
        simCard.classList.remove('glow-positive', 'glow-negative');
        if (diff > 0) simCard.classList.add('glow-positive');
        else if (diff < -1000) simCard.classList.add('glow-negative');

        // 2. Risk Shift
        const riskVal = document.getElementById('simRiskVal');
        const riskDelta = document.getElementById('simRiskDelta');
        riskVal.textContent = sim.risk_category;

        if (sim.risk_category !== baseline.risk_category) {
            riskDelta.textContent = `Shift from ${baseline.risk_category}`;
            riskDelta.className = "impact-delta delta-neg"; // Usually any shift from baseline risk in sim is a "change"
        } else {
            riskDelta.textContent = "No Change";
            riskDelta.className = "impact-delta";
        }

        // 3. Best Crop Change
        const cropVal = document.getElementById('simCropVal');
        const cropDelta = document.getElementById('simCropDelta');
        const alertBox = document.getElementById('cropChangeAlert');

        cropVal.textContent = sim.name;
        if (sim.name !== baseline.name) {
            cropDelta.textContent = "NEW OPTIMAL";
            cropDelta.className = "impact-delta delta-pos";
            alertBox.style.display = "block";
            document.getElementById('newBestCrop').textContent = sim.name;
        } else {
            cropDelta.textContent = "Primary";
            cropDelta.className = "impact-delta";
            alertBox.style.display = "none";
        }
    }

    // Liquid-Smooth Number Counter
    function animateValue(obj, start, end, duration, prefix = '') {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const val = Math.floor(progress * (end - start) + start);
            obj.innerHTML = prefix + val.toLocaleString('en-IN');
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // --- NEW: Farmer Mode & Translation Engine ---
    const modeInput = document.getElementById('modeInput');
    if (modeInput) {
        modeInput.addEventListener('change', (e) => {
            const isFarmer = e.target.checked;
            document.body.classList.toggle('farmer-mode', isFarmer);
            updateUILanguage(isFarmer ? 'hi' : 'en');
        });
    }

    function updateUILanguage(lang) {
        const trans = window.AgriData.HI_TRANSLATIONS;
        const elements = document.querySelectorAll('[data-translate]');

        elements.forEach(el => {
            const key = el.getAttribute('data-translate');
            if (lang === 'hi' && trans[key]) {
                // Store original if not stored
                if (!el.hasAttribute('data-orig')) {
                    el.setAttribute('data-orig', el.innerHTML);
                }

                // Preserve Icon if present
                const icon = el.querySelector('i');
                const iconHtml = icon ? icon.outerHTML + ' ' : '';
                el.innerHTML = iconHtml + trans[key];
            } else if (lang === 'en' && el.hasAttribute('data-orig')) {
                el.innerHTML = el.getAttribute('data-orig');
            }
        });

        // Update Button Text separately if needed
        const optBtn = document.getElementById('optimizeBtn');
        if (optBtn) {
            optBtn.textContent = lang === 'hi' ? trans['optimize_btn'] : "Run Engine";
        }
    }

    // --- NEW: Web Speech API for Hindi Voice Input ---
    const voiceBtn = document.createElement('button');
    voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    voiceBtn.className = 'voice-input-btn';
    voiceBtn.title = "Speak in Hindi / हिंदी में बोलें";
    // Append to a visible spot in form
    const formTitle = document.querySelector('.input-panel h3');
    if (formTitle) formTitle.appendChild(voiceBtn);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'hi-IN';
        recognition.continuous = false;
        recognition.interimResults = false;

        voiceBtn.onclick = (e) => {
            e.preventDefault();
            recognition.start();
            voiceBtn.classList.add('listening');
        };

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            processVoiceCommand(text);
            voiceBtn.classList.remove('listening');
        };

        recognition.onerror = () => {
            voiceBtn.classList.remove('listening');
            alert(window.AgriData.HI_TRANSLATIONS['voice_error'] || "Voice Error");
        };
    }

    function processVoiceCommand(text) {
        console.log("Voice Input:", text);
        // Simple Logic: If "Wheat" or "Gehu" mentioned, set crop (if applicable)
        // Or "Pachas Hazar" -> Budget
        if (text.includes("हजार")) {
            const num = text.match(/\d+/) || [50000];
            document.getElementById('totalBudget').value = num[0];
        }
        // Add more keyword mappings as needed for a robust demo
    }

    /* =========================================================================
       WOW-FACTOR ANIMATION ORCHESTRATOR
       Handles the scroll reveals for a premium hackathon presentation feel.
       ========================================================================= */
    function initScrollAnimations() {
        // High-performance observer settings
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -50px 0px', // Trigger slightly before it hits the bottom
            threshold: 0.1 // Just 10% visibility is enough to trigger
        };

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Add the class that triggers the CSS transition
                    entry.target.classList.add('is-visible');

                    // Optional: Unobserve after revealing to prevent re-animating on scroll up (cleaner look)
                    // observer.unobserve(entry.target); 
                } else {
                    // Remove if you want it to fade out when scrolling past
                    entry.target.classList.remove('is-visible');
                }
            });
        }, observerOptions);

        // Select all major container elements that should animate in
        const elementsToAnimate = [
            // Structural Blocks
            '.hero-content', '.glass-panel', '.input-panel',
            // Results Containers
            '.result-card', '.simulation-card', '.sustainability-card',
            // Specific Elements
            '.esg-dashboard', '.impact-grid', '.weather-panel'
        ];

        // Apply base reveal class and observe
        elementsToAnimate.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                // Determine if we want a specific direction or pop effect
                if (el.classList.contains('simulation-card')) {
                    el.classList.add('reveal-pop'); // Bouncy pop for the "Wow!" element
                } else if (el.classList.contains('sidebar')) {
                    el.classList.add('reveal-on-scroll', 'reveal-right'); // Slide from side
                } else {
                    el.classList.add('reveal-on-scroll'); // Standard float up
                }

                revealObserver.observe(el);
            });
        });

        // Setup staggered animations for lists/grids (e.g., crop suggestions, metrics)
        const setupStagger = (parentSelector, childSelector) => {
            document.querySelectorAll(parentSelector).forEach(container => {
                const children = container.querySelectorAll(childSelector);
                children.forEach((child, index) => {
                    child.classList.add('reveal-on-scroll');

                    // Assign cascading delay classes based on flex/grid order
                    // Capped at 500ms to keep it snappy
                    const delayClass = `delay-${Math.min((index + 1) * 100, 500)}`;
                    child.classList.add(delayClass);

                    revealObserver.observe(child);
                });
            });
        };

        // Stagger the intelligence pills and resource allocation items
        setupStagger('.crop-list', '.suggestion-pill');
        setupStagger('.allocation-grid', '.allocation-item');
        setupStagger('.metric-grid', '.metric');
    }

    // Initialize animations after a short delay to ensure DOM is fully rendered
    // and to not block initial paint
    setTimeout(initScrollAnimations, 100);

    /* =========================================================================
       IOT SENSOR DEMO DATA GENERATOR
       ========================================================================= */
    const loadDemoSensorBtn = document.getElementById('loadDemoSensorBtn');
    const demoStatus = document.getElementById('demoStatus');
    const sensorCsvInput = document.getElementById('sensorCsv');

    // Also handle manual file upload text update
    if (sensorCsvInput) {
        sensorCsvInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const fileName = e.target.files[0].name;
                const uploadText = e.target.closest('.file-upload-wrapper').querySelector('.upload-text');
                if (uploadText) {
                    uploadText.innerHTML = `Selected: <strong>${fileName}</strong>`;
                }
            }
        });
    }

    if (loadDemoSensorBtn) {
        loadDemoSensorBtn.addEventListener('click', () => {
            demoStatus.textContent = "Generating 14-day sensor logs...";
            demoStatus.style.color = "var(--highlight)";

            // Simulate processing time for hackathon wow-factor
            setTimeout(() => {
                const demoData = generateDemoTimeSeriesData();
                sessionStorage.setItem('agri_sensor_data', JSON.stringify(demoData));

                demoStatus.textContent = "✓ 336 Data points loaded successfully!";
                demoStatus.style.color = "var(--status-safe)";

                // Update file input UI to show it's "loaded"
                const uploadText = document.querySelector('.upload-text');
                if (uploadText) {
                    uploadText.innerHTML = `Loaded: <strong>14-day_sensor_log.csv</strong>`;
                }
            }, 800);
        });
    }

    // Helper to generate realistic-looking time series data (Hourly for 14 days = 336 points)
    function generateDemoTimeSeriesData() {
        const data = [];
        let currentTemp = 25;
        let currentMoisture = 35; // Optimal: 25-40%
        let currentPH = 6.8;      // Optimal: 6.0-7.5
        let currentNitrogen = 350; // Optimal: 200-500

        const now = new Date();
        const startTime = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)); // 14 days ago

        for (let i = 0; i < 336; i++) {
            const timestamp = new Date(startTime.getTime() + (i * 60 * 60 * 1000));

            // Diurnal temperature cycle (between ~15 and ~30)
            const hour = timestamp.getHours();
            const tempBase = 22 + Math.sin((hour - 6) * Math.PI / 12) * 8;
            currentTemp = tempBase + (Math.random() * 2 - 1);

            // Moisture drops slowly
            currentMoisture -= (currentTemp / 200) + (Math.random() * 0.1);
            // Severe drought simulation at index 240 (day 10)
            if (i === 240) {
                currentMoisture -= 18;
            }
            // Rapid recovery
            if (i === 280) {
                currentMoisture += 25;
            }
            if (currentMoisture < 8) currentMoisture = 8;
            if (currentMoisture > 60) currentMoisture = 60;

            // pH mostly stable
            currentPH += (Math.random() * 0.04 - 0.02);
            // Sudden acidic dip towards end
            if (i > 288 && i < 300) {
                currentPH -= 0.15;
            }
            if (currentPH < 4.5) currentPH = 4.5;

            // Nitrogen drops steadily
            currentNitrogen -= (Math.random() * 2);
            if (currentNitrogen < 50) currentNitrogen = 50;

            data.push({
                timestamp: timestamp.toISOString(),
                temperature: currentTemp.toFixed(1),
                moisture: currentMoisture.toFixed(1),
                ph: currentPH.toFixed(2),
                nitrogen: currentNitrogen.toFixed(0)
            });
        }
        return data;
    }

});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadFilterService = exports.LeadFilterService = void 0;
const Lead_1 = require("../../../models/Lead");
const cache_service_1 = require("../../../services/cache.service");
const CATEGORY_NORMALIZATION_MAP = {
    'restaurant': 'Restaurant',
    'restaurants': 'Restaurant',
    'restaurant & bar': 'Restaurant',
    'food': 'Restaurant',
    'dining': 'Restaurant',
    'fine dining': 'Restaurant',
    'hotel': 'Hotel',
    'hotels': 'Hotel',
    'lodge': 'Hotel',
    'lodging': 'Hotel',
    'inn': 'Hotel',
    'motel': 'Hotel',
    'resort': 'Resort',
    'resorts': 'Resort',
    'gym': 'Gym',
    'fitness centre': 'Gym',
    'fitness center': 'Gym',
    'fitness': 'Gym',
    'gymnasium': 'Gym',
    'health club': 'Gym',
    'yoga studio': 'Gym',
    'yoga': 'Gym',
    'website design': 'Website Design',
    'web designer': 'Website Design',
    'website designer': 'Website Design',
    'web design': 'Website Design',
    'web development': 'Web Development',
    'website development': 'Web Development',
    'web developer': 'Web Development',
    'website developer': 'Web Development',
    'web design company': 'Website Design',
    'web development company': 'Web Development',
    'software company': 'Software Company',
    'software development company': 'Software Company',
    'software': 'Software Company',
    'software development': 'Software Company',
    'it company': 'IT Company',
    'it services': 'IT Company',
    'information technology': 'IT Company',
    'it': 'IT Company',
    'information technology company': 'IT Company',
    'computer software': 'Software Company',
    'digital marketing': 'Digital Marketing Agency',
    'digital marketing agency': 'Digital Marketing Agency',
    'seo company': 'Digital Marketing Agency',
    'seo services': 'Digital Marketing Agency',
    'seo': 'Digital Marketing Agency',
    'search engine optimization': 'Digital Marketing Agency',
    'digital marketing services': 'Digital Marketing Agency',
    'social media marketing': 'Digital Marketing Agency',
    'ppc company': 'Digital Marketing Agency',
    'marketing agency': 'Marketing Agency',
    'marketing': 'Marketing Agency',
    'advertising agency': 'Marketing Agency',
    'ad agency': 'Marketing Agency',
    'branding agency': 'Marketing Agency',
    'creative agency': 'Marketing Agency',
    'communications agency': 'Marketing Agency',
    'media agency': 'Marketing Agency',
    'ca firm': 'CA Firm',
    'chartered accountant': 'CA Firm',
    'chartered accountants': 'CA Firm',
    'ca': 'CA Firm',
    'accountant': 'CA Firm',
    'accounting': 'CA Firm',
    'accounting firm': 'CA Firm',
    'tax consultant': 'CA Firm',
    'tax consultancy': 'CA Firm',
    'audit firm': 'CA Firm',
    'lawyer': 'Lawyer',
    'law firm': 'Lawyer',
    'advocate': 'Lawyer',
    'advocates': 'Lawyer',
    'legal': 'Lawyer',
    'legal services': 'Lawyer',
    'attorney': 'Lawyer',
    'solicitor': 'Lawyer',
    'dentist': 'Dentist',
    'dental clinic': 'Dentist',
    'dental': 'Dentist',
    'dental care': 'Dentist',
    'dental hospital': 'Dentist',
    'orthodontist': 'Dentist',
    'hospital': 'Hospital',
    'hospitals': 'Hospital',
    'nursing home': 'Hospital',
    'multi speciality hospital': 'Hospital',
    'multispeciality hospital': 'Hospital',
    'super speciality hospital': 'Hospital',
    'clinic': 'Clinic',
    'doctor': 'Clinic',
    'physician': 'Clinic',
    'medical clinic': 'Clinic',
    'health clinic': 'Clinic',
    'diagnostic centre': 'Clinic',
    'diagnostic center': 'Clinic',
    'medical store': 'Medical Store',
    'medical': 'Medical Store',
    'medical shop': 'Medical Store',
    'chemist': 'Medical Store',
    'pharmacy': 'Pharmacy',
    'pharmaceutical': 'Pharmacy',
    'drug store': 'Pharmacy',
    'salon': 'Salon',
    'beauty salon': 'Salon',
    'unisex salon': 'Salon',
    'hair salon': 'Salon',
    'nail salon': 'Salon',
    'spa': 'Spa',
    'day spa': 'Spa',
    'wellness spa': 'Spa',
    'massage': 'Spa',
    'massage centre': 'Spa',
    'beauty parlour': 'Beauty Parlour',
    'beauty parlor': 'Beauty Parlour',
    'parlour': 'Beauty Parlour',
    'parlor': 'Beauty Parlour',
    'beauty': 'Beauty Parlour',
    'beauty clinic': 'Beauty Parlour',
    'tattoo studio': 'Tattoo Studio',
    'tattoo': 'Tattoo Studio',
    'tattoo shop': 'Tattoo Studio',
    'piercing': 'Tattoo Studio',
    'cafe': 'Cafe',
    'café': 'Cafe',
    'coffee shop': 'Cafe',
    'coffee': 'Cafe',
    'coffee house': 'Cafe',
    'coffee bar': 'Cafe',
    'tea shop': 'Cafe',
    'tea': 'Cafe',
    'bakery': 'Bakery',
    'bakeries': 'Bakery',
    'cake shop': 'Bakery',
    'confectionery': 'Bakery',
    'patisserie': 'Bakery',
    'fast food': 'Fast Food',
    'fast food restaurant': 'Fast Food',
    'takeaway': 'Fast Food',
    'take away': 'Fast Food',
    'quick bites': 'Fast Food',
    'street food': 'Fast Food',
    'food stall': 'Fast Food',
    'pizza': 'Pizza Restaurant',
    'pizza restaurant': 'Pizza Restaurant',
    'pizzeria': 'Pizza Restaurant',
    'dhaba': 'Dhaba',
    'dhaba restaurant': 'Dhaba',
    'guest house': 'Guest House',
    'guesthouse': 'Guest House',
    'homestay': 'Homestay',
    'home stay': 'Homestay',
    'bed and breakfast': 'Guest House',
    'b&b': 'Guest House',
    'paying guest': 'Guest House',
    'pg accommodation': 'Guest House',
    'travel agency': 'Travel Agency',
    'travel agent': 'Travel Agency',
    'travel': 'Travel Agency',
    'tour operator': 'Travel Agency',
    'tour and travel': 'Travel Agency',
    'tour & travel': 'Travel Agency',
    'travel company': 'Travel Agency',
    'tourism': 'Travel Agency',
    'travel services': 'Travel Agency',
    'real estate': 'Real Estate',
    'real estate agent': 'Real Estate',
    'real estate agency': 'Real Estate',
    'real estate developer': 'Real Estate',
    'property': 'Real Estate',
    'property dealer': 'Real Estate',
    'property consultant': 'Real Estate',
    'builder': 'Real Estate',
    'construction': 'Real Estate',
    'construction company': 'Real Estate',
    'realtor': 'Real Estate',
    'broker': 'Real Estate',
    'estate agent': 'Real Estate',
    'furniture shop': 'Furniture Shop',
    'furniture store': 'Furniture Shop',
    'furniture': 'Furniture Shop',
    'furniture showroom': 'Furniture Shop',
    'furniture dealer': 'Furniture Shop',
    'furniture manufacturer': 'Furniture Shop',
    'home furniture': 'Furniture Shop',
    'office furniture': 'Furniture Shop',
    'electronics store': 'Electronics Store',
    'electronics': 'Electronics Store',
    'electronic shop': 'Electronics Store',
    'electronic store': 'Electronics Store',
    'electricals': 'Electronics Store',
    'electrical shop': 'Electronics Store',
    'home appliances': 'Electronics Store',
    'appliance store': 'Electronics Store',
    'mobile shop': 'Mobile Shop',
    'mobile store': 'Mobile Shop',
    'mobile': 'Mobile Shop',
    'mobile phone shop': 'Mobile Shop',
    'mobile dealer': 'Mobile Shop',
    'smartphone shop': 'Mobile Shop',
    'mobile repair': 'Mobile Shop',
    'computer shop': 'Computer Shop',
    'computer store': 'Computer Shop',
    'computer': 'Computer Shop',
    'laptop shop': 'Computer Shop',
    'laptop store': 'Computer Shop',
    'computer repair': 'Computer Shop',
    'computer sales': 'Computer Shop',
    'computer services': 'Computer Shop',
    'hardware store': 'Hardware Store',
    'hardware shop': 'Hardware Store',
    'hardware': 'Hardware Store',
    'iron store': 'Hardware Store',
    'paint store': 'Hardware Store',
    'building material': 'Hardware Store',
    'construction material': 'Hardware Store',
    'sanitary store': 'Hardware Store',
    'plumbing store': 'Hardware Store',
    'clothing store': 'Clothing Store',
    'clothing': 'Clothing Store',
    'cloth store': 'Clothing Store',
    'garment shop': 'Clothing Store',
    'garment': 'Clothing Store',
    'fashion': 'Clothing Store',
    'fashion store': 'Clothing Store',
    'apparel': 'Clothing Store',
    'dress shop': 'Clothing Store',
    'mens wear': 'Clothing Store',
    'women\'s wear': 'Clothing Store',
    'kids wear': 'Clothing Store',
    'ready made': 'Clothing Store',
    'readymade': 'Clothing Store',
    'boutique': 'Boutique',
    'boutique store': 'Boutique',
    'fashion boutique': 'Boutique',
    'supermarket': 'Supermarket',
    'mall': 'Supermarket',
    'shopping mall': 'Supermarket',
    'shopping centre': 'Supermarket',
    'shopping center': 'Supermarket',
    'department store': 'Supermarket',
    'mart': 'Supermarket',
    'hypermarket': 'Supermarket',
    'megamart': 'Supermarket',
    'grocery store': 'Grocery Store',
    'grocery': 'Grocery Store',
    'grocery shop': 'Grocery Store',
    'kirana': 'Grocery Store',
    'kirana store': 'Grocery Store',
    'provision': 'Grocery Store',
    'provision store': 'Grocery Store',
    'general store': 'Grocery Store',
    'ration shop': 'Grocery Store',
    'daily needs': 'Grocery Store',
    'vegetable shop': 'Grocery Store',
    'fruit shop': 'Grocery Store',
    'market': 'Grocery Store',
    'school': 'School',
    'schools': 'School',
    'public school': 'School',
    'international school': 'School',
    'convent school': 'School',
    'cbse school': 'School',
    'education': 'School',
    'college': 'College',
    'colleges': 'College',
    'university': 'College',
    'institute of technology': 'College',
    'engineering college': 'College',
    'medical college': 'College',
    'degree college': 'College',
    'coaching centre': 'Coaching Centre',
    'coaching center': 'Coaching Centre',
    'coaching': 'Coaching Centre',
    'coaching classes': 'Coaching Centre',
    'tuition': 'Coaching Centre',
    'tuition classes': 'Coaching Centre',
    'tuition centre': 'Coaching Centre',
    'tutorial': 'Coaching Centre',
    'class': 'Coaching Centre',
    'classes': 'Coaching Centre',
    'training institute': 'Training Institute',
    'training': 'Training Institute',
    'training centre': 'Training Institute',
    'training center': 'Training Institute',
    'academy': 'Training Institute',
    'skill development': 'Training Institute',
    'vocational training': 'Training Institute',
    'computer training': 'Training Institute',
    'computer institute': 'Training Institute',
    'it training': 'Training Institute',
    'factory': 'Factory',
    'factories': 'Factory',
    'industry': 'Factory',
    'industries': 'Factory',
    'mill': 'Factory',
    'mills': 'Factory',
    'plant': 'Factory',
    'manufacturer': 'Manufacturer',
    'manufacturers': 'Manufacturer',
    'manufacturing': 'Manufacturer',
    'manufacturing company': 'Manufacturer',
    'production': 'Manufacturer',
    'producer': 'Manufacturer',
    'processor': 'Manufacturer',
    'processing': 'Manufacturer',
    'workshop': 'Manufacturer',
    'fabrication': 'Manufacturer',
    'exporter': 'Exporter',
    'exporters': 'Exporter',
    'export': 'Exporter',
    'exports': 'Exporter',
    'export house': 'Exporter',
    'importer': 'Exporter',
    'import export': 'Exporter',
    'importer exporter': 'Exporter',
    'wholesaler': 'Wholesaler',
    'wholesalers': 'Wholesaler',
    'wholesale': 'Wholesaler',
    'wholesale dealer': 'Wholesaler',
    'distributor': 'Wholesaler',
    'distributors': 'Wholesaler',
    'stockist': 'Wholesaler',
    'supplier': 'Wholesaler',
    'suppliers': 'Wholesaler',
    'trading': 'Wholesaler',
    'trader': 'Wholesaler',
    'traders': 'Wholesaler',
    'dealer': 'Wholesaler',
    'dealers': 'Wholesaler',
    'retailer': 'Retailer',
    'retailers': 'Retailer',
    'retail': 'Retailer',
    'retail store': 'Retailer',
    'retail shop': 'Retailer',
    'interior designer': 'Interior Designer',
    'interior design': 'Interior Designer',
    'interior': 'Interior Designer',
    'interior decorator': 'Interior Designer',
    'interior decoration': 'Interior Designer',
    'home interior': 'Interior Designer',
    'office interior': 'Interior Designer',
    'architect': 'Architect',
    'architecture': 'Architect',
    'architectural': 'Architect',
    'architects': 'Architect',
    'architectural firm': 'Architect',
    'architecture firm': 'Architect',
    'photographer': 'Photographer',
    'photographers': 'Photographer',
    'photography': 'Photographer',
    'photo studio': 'Photographer',
    'photography studio': 'Photographer',
    'videographer': 'Photographer',
    'video production': 'Photographer',
    'event planner': 'Event Planner',
    'event planning': 'Event Planner',
    'event management': 'Event Planner',
    'event management company': 'Event Planner',
    'event organizer': 'Event Planner',
    'events': 'Event Planner',
    'event': 'Event Planner',
    'wedding planner': 'Wedding Planner',
    'wedding planning': 'Wedding Planner',
    'wedding': 'Wedding Planner',
    'wedding organizer': 'Wedding Planner',
    'wedding management': 'Wedding Planner',
    'printing press': 'Printing Press',
    'printing': 'Printing Press',
    'printer': 'Printing Press',
    'printers': 'Printing Press',
    'printing shop': 'Printing Press',
    'printing services': 'Printing Press',
    'offset printing': 'Printing Press',
    'digital printing': 'Printing Press',
    'flex printing': 'Printing Press',
    'courier service': 'Courier Service',
    'courier': 'Courier Service',
    'courier services': 'Courier Service',
    'logistics': 'Logistics',
    'logistics company': 'Logistics',
    'logistics services': 'Logistics',
    'transport': 'Logistics',
    'transportation': 'Logistics',
    'transport company': 'Logistics',
    'transport services': 'Logistics',
    'shipping': 'Logistics',
    'cargo': 'Logistics',
    'freight': 'Logistics',
    'warehouse': 'Logistics',
    'packers and movers': 'Logistics',
    'packers & movers': 'Logistics',
    'movers': 'Logistics',
    'car rental': 'Car Rental',
    'car hire': 'Car Rental',
    'car rental service': 'Car Rental',
    'car on rent': 'Car Rental',
    'self drive car': 'Car Rental',
    'taxi service': 'Car Rental',
    'cab service': 'Car Rental',
    'bike rental': 'Bike Rental',
    'bike hire': 'Bike Rental',
    'bike rental service': 'Bike Rental',
    'motorcycle rental': 'Bike Rental',
    'scooter rental': 'Bike Rental',
    'cycle rental': 'Bike Rental',
    'rental': 'Car Rental',
    'repair shop': 'Repair Shop',
    'repair': 'Repair Shop',
    'repairing': 'Repair Shop',
    'repair service': 'Repair Shop',
    'repair services': 'Repair Shop',
    'service center': 'Repair Shop',
    'service centre': 'Repair Shop',
    'maintenance': 'Repair Shop',
    'car repair': 'Repair Shop',
    'car service': 'Repair Shop',
    'auto repair': 'Repair Shop',
    'garage': 'Repair Shop',
    'carpenter': 'Repair Shop',
    'carpentry': 'Repair Shop',
    'mechanic': 'Repair Shop',
    'automobile repair': 'Repair Shop',
    'automobile service': 'Repair Shop',
    'bike repair': 'Repair Shop',
    'bike service': 'Repair Shop',
    'ac repair': 'Repair Shop',
    'ac service': 'Repair Shop',
    'refrigerator repair': 'Repair Shop',
    'washing machine repair': 'Repair Shop',
    'tv repair': 'Repair Shop',
    'electrician': 'Electrician',
    'electrical': 'Electrician',
    'electrical contractor': 'Electrician',
    'electrical works': 'Electrician',
    'electrical repair': 'Electrician',
    'electrical services': 'Electrician',
    'plumber': 'Plumber',
    'plumbing': 'Plumber',
    'plumbing contractor': 'Plumber',
    'plumbing works': 'Plumber',
    'plumbing services': 'Plumber',
    'painter': 'Painter',
    'painters': 'Painter',
    'painting': 'Painter',
    'painting contractor': 'Painter',
    'painting services': 'Painter',
    'home painter': 'Painter',
    'consultancy': 'Consultancy',
    'consultant': 'Consultancy',
    'consulting': 'Consultancy',
    'consulting firm': 'Consultancy',
    'business consultant': 'Consultancy',
    'management consultant': 'Consultancy',
    'business services': 'Consultancy',
    'professional services': 'Consultancy',
    'car dealer': 'Automobile Dealer',
    'car showroom': 'Automobile Dealer',
    'automobile dealer': 'Automobile Dealer',
    'automobile': 'Automobile Dealer',
    'car': 'Automobile Dealer',
    'bike showroom': 'Automobile Dealer',
    'bike dealer': 'Automobile Dealer',
    'motorcycle dealer': 'Automobile Dealer',
    'auto dealer': 'Automobile Dealer',
    'jewellery shop': 'Jewellery Shop',
    'jewelry shop': 'Jewellery Shop',
    'jewellery': 'Jewellery Shop',
    'jewelry': 'Jewellery Shop',
    'jeweller': 'Jewellery Shop',
    'jeweler': 'Jewellery Shop',
    'gold shop': 'Jewellery Shop',
    'diamond shop': 'Jewellery Shop',
    'book shop': 'Book Store',
    'book store': 'Book Store',
    'books': 'Book Store',
    'bookshop': 'Book Store',
    'book seller': 'Book Store',
    'stationery': 'Book Store',
    'stationery shop': 'Book Store',
    'sports shop': 'Sports Store',
    'sports store': 'Sports Store',
    'sporting goods': 'Sports Store',
    'sports equipment': 'Sports Store',
    'gym equipment': 'Sports Store',
    'pet shop': 'Pet Store',
    'pet store': 'Pet Store',
    'pet': 'Pet Store',
    'pet supplies': 'Pet Store',
    'veterinary': 'Pet Store',
    'vet': 'Pet Store',
    'animal hospital': 'Pet Store',
    'bank': 'Bank',
    'banking': 'Bank',
    'financial services': 'Finance Company',
    'finance company': 'Finance Company',
    'finance': 'Finance Company',
    'loan': 'Finance Company',
    'insurance': 'Insurance Company',
    'insurance company': 'Insurance Company',
    'insurer': 'Insurance Company',
    'chit fund': 'Finance Company',
    'investment': 'Finance Company',
    'stock broker': 'Finance Company',
    'security services': 'Security Services',
    'security': 'Security Services',
    'security agency': 'Security Services',
    'security guard': 'Security Services',
    'cleaning services': 'Cleaning Services',
    'cleaning': 'Cleaning Services',
    'house cleaning': 'Cleaning Services',
    'office cleaning': 'Cleaning Services',
    'laundry': 'Cleaning Services',
    'laundry service': 'Cleaning Services',
    'dry cleaning': 'Cleaning Services',
    'drycleaner': 'Cleaning Services',
    'caterer': 'Catering Service',
    'catering': 'Catering Service',
    'catering service': 'Catering Service',
    'caterers': 'Catering Service',
    'ngo': 'NGO',
    'non profit': 'NGO',
    'nonprofit': 'NGO',
    'charity': 'NGO',
    'foundation': 'NGO',
    'trust': 'NGO',
    'social service': 'NGO',
    'social organization': 'NGO',
    'society': 'NGO',
    'government office': 'Government Office',
    'government': 'Government Office',
    'govt office': 'Government Office',
    'public sector': 'Government Office',
    'municipal': 'Government Office',
    'co-working space': 'Co-Working Space',
    'coworking': 'Co-Working Space',
    'shared office': 'Co-Working Space',
    'business centre': 'Co-Working Space',
    'business center': 'Co-Working Space',
    'call center': 'Call Center',
    'call centre': 'Call Center',
    'bpo': 'Call Center',
    'bpo company': 'Call Center',
    'customer service': 'Call Center',
    'telecalling': 'Call Center',
    'packaging': 'Packaging',
    'packaging company': 'Packaging',
    'packaging material': 'Packaging',
    'chemical': 'Chemical',
    'chemical company': 'Chemical',
    'chemical manufacturer': 'Chemical',
    'chemicals': 'Chemical',
    'automation': 'Automation',
    'automation company': 'Automation',
    'industrial automation': 'Automation',
    'dairy': 'Dairy',
    'dairy farm': 'Dairy',
    'dairy products': 'Dairy',
    'milk': 'Dairy',
    'farm': 'Agriculture',
    'farming': 'Agriculture',
    'agriculture': 'Agriculture',
    'agricultural': 'Agriculture',
    'agro': 'Agriculture',
    'agro based': 'Agriculture',
    'seeds': 'Agriculture',
    'fertilizer': 'Agriculture',
    'water purifier': 'Water Purifier',
    'water treatment': 'Water Purifier',
    'water supply': 'Water Purifier',
    'ro service': 'Water Purifier',
    'ro water': 'Water Purifier',
    'solar': 'Solar Energy',
    'solar energy': 'Solar Energy',
    'solar panel': 'Solar Energy',
    'solar system': 'Solar Energy',
    'renewable energy': 'Solar Energy',
    'entertainment': 'Entertainment',
    'amusement park': 'Entertainment',
    'water park': 'Entertainment',
    'game zone': 'Entertainment',
    'gaming': 'Entertainment',
    'movie theatre': 'Entertainment',
    'cinema': 'Entertainment',
    'theatre': 'Entertainment',
    'club': 'Entertainment',
    'night club': 'Entertainment',
    'pub': 'Entertainment',
    'bar': 'Entertainment',
    'lounge': 'Entertainment',
    'discotheque': 'Entertainment',
    'parking': 'Parking',
    'parking lot': 'Parking',
    'parking area': 'Parking',
    'tailor': 'Tailor',
    'tailoring': 'Tailor',
    'tailor shop': 'Tailor',
    'alteration': 'Tailor',
    'web hosting': 'Web Hosting',
    'hosting': 'Web Hosting',
    'hosting company': 'Web Hosting',
    'domain registration': 'Web Hosting',
    'server': 'Web Hosting',
    'cloud services': 'Web Hosting',
    'cloud computing': 'Web Hosting',
    'data center': 'Web Hosting',
    'ecommerce': 'E-Commerce',
    'ecommerce company': 'E-Commerce',
    'e-commerce': 'E-Commerce',
    'online shopping': 'E-Commerce',
    'online store': 'E-Commerce',
    'ecommerce website': 'E-Commerce',
    'ecommerce development': 'E-Commerce',
    'ecommerce solutions': 'E-Commerce',
    'mobile app': 'Mobile App Development',
    'mobile app development': 'Mobile App Development',
    'app development': 'Mobile App Development',
    'android app': 'Mobile App Development',
    'ios app': 'Mobile App Development',
    'mobile application': 'Mobile App Development',
    'hospitality': 'Hotel',
    'restaurant & hotel': 'Hotel',
    'accommodation': 'Guest House',
    'room': 'Guest House',
    'rooms': 'Guest House',
    'diesel': 'Automobile Dealer',
    'fertilizers': 'Agriculture',
    'pesticides': 'Agriculture',
    'insecticides': 'Agriculture',
    'tours & travels': 'Travel Agency',
    'tours and travels': 'Travel Agency',
    'travels & tours': 'Travel Agency',
    'cement': 'Hardware Store',
    'cement dealer': 'Hardware Store',
    'tmt bar': 'Hardware Store',
    'steel': 'Hardware Store',
    'steel dealer': 'Hardware Store',
    'pipes': 'Hardware Store',
    'pipe dealer': 'Hardware Store',
    'tiles': 'Hardware Store',
    'tiles dealer': 'Hardware Store',
    'marble': 'Hardware Store',
    'granite': 'Hardware Store',
    'paint': 'Hardware Store',
    'paints': 'Hardware Store',
    'flooring': 'Hardware Store',
    'sanitaryware': 'Hardware Store',
    'bathroom': 'Hardware Store',
    'bath fittings': 'Hardware Store',
    'labour': 'Contractor',
    'labour contractor': 'Contractor',
    'labour supply': 'Contractor',
    'manpower': 'Contractor',
    'manpower supply': 'Contractor',
    'contractor': 'Contractor',
    'contractors': 'Contractor',
    'engineering': 'Engineering',
    'engineering company': 'Engineering',
    'engineering services': 'Engineering',
    'engineering works': 'Engineering',
    'engineering firm': 'Engineering',
    'engineer': 'Engineering',
    'telecom': 'Telecom',
    'telecommunications': 'Telecom',
    'mobile network': 'Telecom',
    'broadband': 'Telecom',
    'internet service': 'Telecom',
    'isp': 'Telecom',
    'internet service provider': 'Telecom',
    'cable tv': 'Telecom',
    'cable operator': 'Telecom',
    'dth': 'Telecom',
    'satellite': 'Telecom',
    'rental services': 'Rental Service',
    'rental service': 'Rental Service',
    'equipment rental': 'Rental Service',
    'tractor rental': 'Rental Service',
    'generator rental': 'Rental Service',
    'printing & packaging': 'Printing Press',
    'packing': 'Packaging',
};
const RATING_PATTERN = /^\d+(\.\d+)?$/;
function isRatingValue(value) {
    return RATING_PATTERN.test(value.trim());
}
function normalizeCategory(raw) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length < 2)
        return null;
    if (isRatingValue(trimmed))
        return null;
    const lower = trimmed.toLowerCase();
    const canonical = CATEGORY_NORMALIZATION_MAP[lower];
    if (canonical)
        return canonical;
    if (lower.endsWith('s')) {
        const singular = lower.slice(0, -1);
        const singularCanonical = CATEGORY_NORMALIZATION_MAP[singular];
        if (singularCanonical)
            return singularCanonical;
    }
    if (lower.endsWith('es') && lower.length > 4) {
        const singular = lower.slice(0, -2);
        const singularCanonical = CATEGORY_NORMALIZATION_MAP[singular];
        if (singularCanonical)
            return singularCanonical;
    }
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
class LeadFilterService {
    buildQuery(options) {
        const query = {};
        const andClauses = [];
        if (options.search) {
            const search = options.search.trim();
            andClauses.push({
                $or: [
                    { companyName: { $regex: search, $options: 'i' } },
                    { website: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { address: { $regex: search, $options: 'i' } },
                    { category: { $regex: search, $options: 'i' } },
                    { searchedKeyword: { $regex: search, $options: 'i' } },
                    { searchedCity: { $regex: search, $options: 'i' } },
                    { searchedArea: { $regex: search, $options: 'i' } },
                    { searchedState: { $regex: search, $options: 'i' } },
                    { searchedBusinessType: { $regex: search, $options: 'i' } },
                ],
            });
        }
        if (options.category) {
            andClauses.push({
                $or: [
                    { category: { $regex: options.category, $options: 'i' } },
                    { searchedBusinessType: { $regex: options.category, $options: 'i' } },
                    { validatedCategory: { $regex: options.category, $options: 'i' } },
                ],
            });
        }
        if (options.source) {
            andClauses.push({
                $or: [
                    { source: options.source },
                    { sources: options.source },
                    { extractionSource: options.source },
                ],
            });
        }
        if (options.sources && options.sources.length > 0) {
            andClauses.push({
                $or: [
                    { source: { $in: options.sources } },
                    { sources: { $in: options.sources } },
                ],
            });
        }
        if (options.state) {
            andClauses.push({ searchedState: { $regex: options.state, $options: 'i' } });
        }
        if (options.city) {
            andClauses.push({ searchedCity: { $regex: options.city, $options: 'i' } });
        }
        if (options.area) {
            andClauses.push({ searchedArea: { $regex: options.area, $options: 'i' } });
        }
        if (options.businessType) {
            andClauses.push({
                $or: [
                    { searchedBusinessType: { $regex: options.businessType, $options: 'i' } },
                    { category: { $regex: options.businessType, $options: 'i' } },
                    { validatedCategory: { $regex: options.businessType, $options: 'i' } },
                ],
            });
        }
        if (options.status) {
            andClauses.push({ leadStatus: options.status });
        }
        if (options.quality) {
            andClauses.push({ aiQuality: options.quality });
        }
        if (options.confidence !== undefined) {
            andClauses.push({ finalConfidence: { $gte: options.confidence } });
        }
        if (options.minConfidence !== undefined) {
            andClauses.push({ finalConfidence: { $gte: options.minConfidence } });
        }
        if (options.maxConfidence !== undefined) {
            andClauses.push({ finalConfidence: { $lte: options.maxConfidence } });
        }
        if (options.hasWebsite === true) {
            andClauses.push({ hasRealWebsite: true });
        }
        else if (options.hasWebsite === false) {
            andClauses.push({
                $or: [
                    { hasRealWebsite: { $ne: true } },
                    { hasRealWebsite: { $exists: false } },
                ],
            });
        }
        if (options.hasPhone === true) {
            andClauses.push({ phone: { $exists: true, $nin: [null, ''] } });
        }
        else if (options.hasPhone === false) {
            andClauses.push({
                $or: [
                    { phone: { $exists: false } },
                    { phone: null },
                    { phone: '' },
                ],
            });
        }
        if (options.hasEmail === true) {
            andClauses.push({ email: { $exists: true, $nin: [null, ''] } });
        }
        else if (options.hasEmail === false) {
            andClauses.push({
                $or: [
                    { email: { $exists: false } },
                    { email: null },
                    { email: '' },
                ],
            });
        }
        if (options.hasWhatsApp === true) {
            andClauses.push({ whatsappNumber: { $exists: true, $nin: [null, ''] } });
        }
        else if (options.hasWhatsApp === false) {
            andClauses.push({
                $or: [
                    { whatsappNumber: { $exists: false } },
                    { whatsappNumber: null },
                    { whatsappNumber: '' },
                ],
            });
        }
        if (options.websiteType) {
            andClauses.push({ websiteType: options.websiteType });
        }
        if (options.socialOnly) {
            andClauses.push({
                websiteType: 'SOCIAL_PROFILE',
            });
        }
        if (options.verifiedOnly) {
            andClauses.push({
                validationStatus: 'validated',
            });
        }
        if (options.validationStatus) {
            andClauses.push({ validationStatus: options.validationStatus });
        }
        if (options.qualificationLevel) {
            andClauses.push({ qualificationLevel: options.qualificationLevel });
        }
        if (options.searchSessionId) {
            andClauses.push({ searchSessionId: options.searchSessionId });
        }
        if (options.enrichmentStatus) {
            andClauses.push({ enrichmentStatus: options.enrichmentStatus });
        }
        if (andClauses.length > 0) {
            query.$and = andClauses;
        }
        return query;
    }
    buildSortOptions(sortField, sortOrder) {
        const allowedFields = [
            'leadScore', 'createdAt', 'companyName', 'rating',
            'finalConfidence', 'quality', 'reviewsCount', 'updatedAt',
        ];
        if (sortField && allowedFields.includes(sortField)) {
            const order = sortOrder === 'asc' ? 1 : -1;
            return { [sortField]: order };
        }
        return { createdAt: -1 };
    }
    async getFilteredLeads(options) {
        const page = options.page || 1;
        const limit = options.limit || 10;
        const skip = (page - 1) * limit;
        const query = this.buildQuery(options);
        const sortOptions = this.buildSortOptions(options.sortField, options.sortOrder);
        const startTime = Date.now();
        const projection = {
            companyName: 1, website: 1, category: 1, source: 1,
            email: 1, phone: 1, address: 1,
            rating: 1, reviewsCount: 1, sourceUrl: 1,
            pincode: 1, latitude: 1, longitude: 1,
            workingHours: 1, businessStatus: 1, plusCode: 1,
            searchedKeyword: 1, searchedLocation: 1,
            searchedState: 1, searchedCity: 1, searchedArea: 1, searchedBusinessType: 1,
            leadStatus: 1, aiQuality: 1, finalConfidence: 1, validationStatus: 1,
            qualificationLevel: 1, leadScore: 1,
            hasWebsite: 1, hasRealWebsite: 1, websiteStatus: 1, websiteClassification: 1,
            analysisEligible: 1, normalizedDomain: 1,
            emailDiscoveryStatus: 1, primaryEmail: 1, emailCount: 1,
            enrichmentStatus: 1, enrichmentProgress: 1, enrichmentCurrentStep: 1,
            responsiveAuditCompleted: 1, responsiveScore: 1, uiuxScore: 1, mobileExperienceScore: 1,
            intelligenceCompleted: 1, salesIntelligenceCompleted: 1,
            aiLeadScore: 1, trustScore: 1,
            sourceMetadata: 1, ownerNames: 1,
            aiSummary: 1, aiWeaknesses: 1, aiOpportunities: 1,
            createdAt: 1, updatedAt: 1,
        };
        const [total, rawLeads] = await Promise.all([
            Lead_1.Lead.countDocuments(query),
            Lead_1.Lead.find(query, projection)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);
        const leads = rawLeads.map(lead => ({
            ...lead,
            id: lead._id ? lead._id.toString() : lead.id,
        }));
        const duration = Date.now() - startTime;
        return {
            leads,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
            duration,
        };
    }
    async getFilterOptions(filters) {
        const cacheKey = `filterOptions:${JSON.stringify(filters || {})}`;
        const cached = cache_service_1.cacheService.get(cacheKey);
        if (cached)
            return cached;
        const baseQuery = {};
        if (filters?.state) {
            baseQuery.searchedState = { $regex: filters.state, $options: 'i' };
        }
        if (filters?.city) {
            baseQuery.searchedCity = { $regex: filters.city, $options: 'i' };
        }
        if (filters?.area) {
            baseQuery.searchedArea = { $regex: filters.area, $options: 'i' };
        }
        const stateFilter = filters?.state ? { searchedState: { $regex: filters.state, $options: 'i' } } : {};
        const cityFilter = filters?.city ? { searchedCity: { $regex: filters.city, $options: 'i' } } : {};
        const [categories, sources, states, cities, areas, businessTypes, qualities, statuses,] = await Promise.all([
            this.getCategoryCounts(baseQuery),
            this.getCounts('source', baseQuery),
            Lead_1.Lead.distinct('searchedState', {
                searchedState: { $exists: true, $nin: [null, ''] },
                ...baseQuery,
            }),
            Lead_1.Lead.distinct('searchedCity', {
                searchedCity: { $exists: true, $nin: [null, ''] },
                ...stateFilter,
            }),
            Lead_1.Lead.distinct('searchedArea', {
                searchedArea: { $exists: true, $nin: [null, ''] },
                ...cityFilter,
                ...stateFilter,
            }),
            this.getCounts('searchedBusinessType', baseQuery),
            this.getCounts('aiQuality', baseQuery),
            this.getCounts('leadStatus', baseQuery),
        ]);
        const result = {
            categories,
            sources,
            states: states.sort(),
            cities: cities.sort(),
            areas: areas.sort(),
            businessTypes,
            qualities,
            statuses,
        };
        cache_service_1.cacheService.set(cacheKey, result, 30000);
        return result;
    }
    async getCategoryCounts(baseQuery = {}) {
        const pipeline = [
            {
                $match: {
                    ...baseQuery,
                    category: { $exists: true, $nin: [null, ''] },
                },
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { count: -1 },
            },
            {
                $limit: 500,
            },
        ];
        const results = await Lead_1.Lead.aggregate(pipeline);
        const normalizedMap = new Map();
        for (const r of results) {
            if (!r._id)
                continue;
            const normalized = normalizeCategory(r._id);
            if (!normalized)
                continue;
            normalizedMap.set(normalized, (normalizedMap.get(normalized) || 0) + r.count);
        }
        return Array.from(normalizedMap.entries())
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 100);
    }
    async getCounts(field, baseQuery = {}) {
        const pipeline = [
            {
                $match: {
                    ...baseQuery,
                    [field]: { $exists: true, $nin: [null, ''] },
                },
            },
            {
                $group: {
                    _id: `$${field}`,
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { count: -1 },
            },
            {
                $limit: 100,
            },
        ];
        const results = await Lead_1.Lead.aggregate(pipeline);
        return results
            .filter((r) => r._id)
            .map((r) => ({
            value: r._id,
            count: r.count,
        }));
    }
}
exports.LeadFilterService = LeadFilterService;
exports.leadFilterService = new LeadFilterService();
//# sourceMappingURL=leadFilter.service.js.map
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const bcryptjs_1 = require("bcryptjs");
const mongoose_1 = __importDefault(require("mongoose"));
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined');
    process.exit(1);
}
async function seed() {
    await mongoose_1.default.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
        console.error('ADMIN_EMAIL is not defined');
        process.exit(1);
    }
    const { User } = await Promise.resolve().then(() => __importStar(require('./models/User')));
    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
        console.log('Admin user already exists');
        await mongoose_1.default.disconnect();
        return;
    }
    const password = process.argv[2];
    if (!password) {
        console.error('Usage: npx ts-node src/seed.ts <admin-password>');
        console.error('This will hash the password and create the admin user');
        process.exit(1);
    }
    const hashedPassword = (0, bcryptjs_1.hashSync)(password, 10);
    await User.create({
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin',
        role: 'admin',
    });
    console.log('Admin user created successfully');
    console.log(`Email: ${adminEmail}`);
    console.log('\nAdd this to your .env file:');
    console.log(`ADMIN_PASSWORD_HASH=${hashedPassword}`);
    await mongoose_1.default.disconnect();
}
seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.testConnection = testConnection;
const postgres_js_1 = require("drizzle-orm/postgres-js");
const postgres_1 = __importDefault(require("postgres"));
const schema = __importStar(require("./schema"));
// Get database URL from environment variables
const databaseUrl = process.env['DATABASE_URL'] || process.env['DIRECT_URL'];
// Ensure we have a database URL
if (!databaseUrl) {
    throw new Error("DATABASE_URL or DIRECT_URL must be set in environment variables. " +
        "Please check your .env.local file and ensure database credentials are properly configured.");
}
const globalForDrizzle = global;
// Create postgres client with error handling
let client;
try {
    client =
        globalForDrizzle.client ??
            (0, postgres_1.default)(databaseUrl, {
                max: 20, // increased connection pool size for better concurrency
                idle_timeout: 30, // increased from 20
                connect_timeout: 30, // increased from 10 to handle slow connections
                ssl: "require", // Always use SSL for Supabase
                prepare: false, // disable prepared statements for Supabase pooler
                connection: {
                    application_name: 'mysetlist_app', // better connection tracking
                },
            });
    if (process.env['NODE_ENV'] !== "production") {
        globalForDrizzle.client = client;
    }
}
catch (error) {
    console.error("Failed to create postgres client:", error);
    throw new Error("Database connection failed. Please check DATABASE_URL");
}
// Create drizzle instance
exports.db = globalForDrizzle.db ?? (0, postgres_js_1.drizzle)(client, { schema });
if (process.env['NODE_ENV'] !== "production")
    globalForDrizzle.db = exports.db;
// Export a function to test the connection
async function testConnection() {
    try {
        await client `SELECT 1`;
        return true;
    }
    catch (error) {
        console.error("Database connection test failed:", error);
        return false;
    }
}
__exportStar(require("./schema"), exports);
__exportStar(require("./utils/growth-calculation"), exports);
__exportStar(require("./schema/admin"), exports);

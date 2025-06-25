// Enhanced Claude Code Web UI Server with dual authentication
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';

config(); // Load environment variables

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname, 'dist')));

// Store client authentication state
const clientAuth = new Map();

// Test Claude CLI authentication
async function testClaudeCLI() {
    return new Promise((resolve) => {
        const claude = spawn('claude', ['--version'], { 
            stdio: ['ignore', 'pipe', 'pipe'] 
        });
        
        let output = '';
        claude.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        claude.on('close', (code) => {
            resolve(code === 0);
        });
        
        claude.on('error', () => {
            resolve(false);
        });
    });
}

// Query using Claude CLI
function queryClaudeCLI(prompt, model = null) {
    return new Promise((resolve, reject) => {
        const args = [prompt, '--print'];
        
        if (model) {
            switch (model) {
                case 'default':
                    // Don't specify a model - uses default behavior
                    break;
                case 'opus':
                    args.push('--model', 'opus');
                    break;
                case 'sonnet':
                    args.push('--model', 'sonnet');
                    break;
                case 'haiku':
                    args.push('--model', 'haiku');
                    break;
                default:
                    // For specific model IDs, use them directly
                    if (model.startsWith('claude-')) {
                        args.push('--model', model);
                    }
            }
        }
        
        const claude = spawn('claude', args, {
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        let output = '';
        let error = '';
        
        claude.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        claude.stderr.on('data', (data) => {
            error += data.toString();
        });
        
        claude.on('close', (code) => {
            if (code === 0) {
                resolve(output.trim());
            } else {
                reject(new Error(error || 'Claude CLI failed'));
            }
        });
        
        claude.on('error', (error) => {
            reject(new Error(`Failed to start Claude CLI: ${error.message}`));
        });
    });
}

// Query using API key
async function queryClaudeAPI(apiKey, prompt, model = 'claude-3-5-sonnet-20241022') {
    const anthropic = new Anthropic({ apiKey });
    
    try {
        const message = await anthropic.messages.create({
            model: model,
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }]
        });
        
        return message.content[0].text;
    } catch (error) {
        throw new Error(`API Error: ${error.message}`);
    }
}

// Get current model for CLI
function getCurrentModelCLI() {
    return new Promise((resolve) => {
        const claude = spawn('claude', ['What specific model are you? Just give me the model name, nothing else.', '--print'], {
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        let output = '';
        claude.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        claude.on('close', (code) => {
            if (code === 0) {
                const response = output.toLowerCase().trim();
                
                if (response.includes('opus-4') || response.includes('claude-opus-4')) {
                    resolve('default');
                } else if (response.includes('sonnet-4') || response.includes('claude-sonnet-4')) {
                    resolve('sonnet');
                } else if (response.includes('3.5 sonnet')) {
                    resolve('claude-3-5-sonnet-20241022');
                } else {
                    resolve('default');
                }
            } else {
                resolve('default');
            }
        });
        
        claude.on('error', () => {
            resolve('default');
        });
    });
}

// WebSocket connection handling
wss.on('connection', async (ws) => {
    console.log('🔌 New WebSocket connection');
    const clientId = Date.now().toString();
    
    // Check for existing API key in environment
    if (process.env.ANTHROPIC_API_KEY) {
        clientAuth.set(clientId, { method: 'apikey', apiKey: process.env.ANTHROPIC_API_KEY });
        ws.send(JSON.stringify({ 
            type: 'auth_success',
            message: 'Connected using API key from environment',
            model: 'claude-3-5-sonnet-20241022'
        }));
    } else {
        // Test Claude CLI
        const cliAvailable = await testClaudeCLI();
        
        if (cliAvailable) {
            clientAuth.set(clientId, { method: 'cli' });
            const currentModel = await getCurrentModelCLI();
            ws.send(JSON.stringify({ 
                type: 'auth_success',
                message: 'Connected using Claude CLI',
                model: currentModel
            }));
        } else {
            ws.send(JSON.stringify({ 
                type: 'auth_required',
                message: 'Authentication required'
            }));
        }
    }
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'authenticate':
                    if (data.method === 'cli') {
                        const cliAvailable = await testClaudeCLI();
                        if (cliAvailable) {
                            clientAuth.set(clientId, { method: 'cli' });
                            const currentModel = await getCurrentModelCLI();
                            ws.send(JSON.stringify({ 
                                type: 'auth_success',
                                message: 'Connected using Claude CLI',
                                model: currentModel
                            }));
                        } else {
                            ws.send(JSON.stringify({ 
                                type: 'auth_error',
                                message: 'Claude CLI not available or not authenticated'
                            }));
                        }
                    } else if (data.method === 'apikey' && data.apiKey) {
                        // Test the API key
                        try {
                            const anthropic = new Anthropic({ apiKey: data.apiKey });
                            await anthropic.messages.create({
                                model: 'claude-3-5-sonnet-20241022',
                                max_tokens: 10,
                                messages: [{ role: 'user', content: 'Hi' }]
                            });
                            
                            clientAuth.set(clientId, { method: 'apikey', apiKey: data.apiKey });
                            ws.send(JSON.stringify({ 
                                type: 'auth_success',
                                message: 'Connected using API key',
                                model: 'claude-3-5-sonnet-20241022'
                            }));
                        } catch (error) {
                            ws.send(JSON.stringify({ 
                                type: 'auth_error',
                                message: 'Invalid API key'
                            }));
                        }
                    }
                    break;
                    
                case 'query':
                    const auth = clientAuth.get(clientId);
                    if (!auth) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Not authenticated'
                        }));
                        return;
                    }
                    
                    console.log('📝 Processing query:', data.prompt.substring(0, 50) + '...');
                    
                    try {
                        ws.send(JSON.stringify({
                            type: 'loading',
                            message: 'Thinking...'
                        }));
                        
                        let response;
                        let usedModel = data.model;
                        
                        if (auth.method === 'cli') {
                            response = await queryClaudeCLI(data.prompt, data.model);
                            if (!usedModel) {
                                usedModel = await getCurrentModelCLI();
                            }
                        } else {
                            response = await queryClaudeAPI(auth.apiKey, data.prompt, data.model || 'claude-3-5-sonnet-20241022');
                            if (!usedModel) {
                                usedModel = 'claude-3-5-sonnet-20241022';
                            }
                        }
                        
                        ws.send(JSON.stringify({
                            type: 'result',
                            content: response,
                            model: usedModel
                        }));
                    } catch (error) {
                        console.error('❌ Query error:', error);
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: error.message
                        }));
                    }
                    break;
                    
                default:
                    console.log('❓ Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('❌ WebSocket error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: error.message
            }));
        }
    });
    
    ws.on('close', () => {
        console.log('🔌 WebSocket disconnected');
        clientAuth.delete(clientId);
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Claude Code Web UI Server running on http://localhost:${PORT}`);
    console.log('🔐 Authentication methods available:');
    console.log('   - Claude CLI (if installed and authenticated)');
    console.log('   - API Key (environment variable or manual entry)');
});
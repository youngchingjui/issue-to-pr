// scripts/start-services.js
// Cross-platform Node.js version of start-services.sh
// Loads env, runs docker-compose, waits for Neo4j, ensures Redis, verifies services

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import axios from 'axios';
import * as dotenv from 'dotenv';
import Redis from 'ioredis';

function log(msg) {
  process.stdout.write(msg + '\n');
}

function loadEnv() {
  // Determine which env file to use based on NODE_ENV
  const envFile = process.env.NODE_ENV === 'production'
    ? '.env.production.local'
    : '.env.local';
  const fullPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(fullPath)) {
    log(`Loading environment variables from ${envFile}`);
    const result = dotenv.config({ path: fullPath });
    // Make ENV_FILE available for docker-compose
    process.env.ENV_FILE = path.relative(path.resolve(__dirname, '../docker'), fullPath);
    if (result.error) {
      log(`Warning: Could not parse ${envFile}: ${result.error}`);
    }
  } else {
    log(`Warning: ${envFile} not found`);
  }
}

function runDockerCompose() {
  return new Promise((resolve, reject) => {
    log('Starting Docker services...');
    const dockerDir = path.resolve(__dirname, '../docker');
    const child = spawn(
      process.platform === 'win32' ? 'docker-compose.exe' : 'docker-compose',
      ['up', '-d'],
      {
        cwd: dockerDir,
        stdio: 'inherit',
        env: process.env // pass env
      }
    );
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error('docker-compose up failed'));
    });
    child.on('error', err => reject(err));
  });
}

async function waitForNeo4j() {
  const url = 'http://localhost:7474';
  log('Waiting for Neo4j to be ready...');
  for (let i = 0; i < 60; ++i) { // up to 60s
    try {
      await axios.get(url, { timeout: 2000 });
      log('Neo4j is ready!');
      return;
    } catch(e) {
      await new Promise(res => setTimeout(res, 1000));
    }
  }
  throw new Error('Neo4j did not become ready in time!');
}

function isRedisRunning() {
  return new Promise((resolve) => {
    // Check if redis-server is running locally (Unix only)
    if (process.platform === 'win32') return resolve(false); // skip
    const ps = spawn('pgrep', ['-x', 'redis-server']);
    let found = false;
    ps.stdout.on('data', data => {
      if (String(data).trim().length > 0) found = true;
    });
    ps.on('exit', () => resolve(found));
    ps.on('error', () => resolve(false));
  });
}

function startRedis() {
  return new Promise((resolve, reject) => {
    log('Starting Redis...');
    const child = spawn('redis-server', ['--daemonize', 'yes']);
    child.on('exit', code => {
      setTimeout(() => {
        if (code === 0) resolve();
        else reject(new Error('Failed to start redis-server'));
      }, 2000);
    });
    child.on('error', err => reject(err));
  });
}

async function verifyRedis() {
  log('Verifying Redis connection...');
  try {
    // Use standard redis client on localhost; not Upstash
    const redis = new Redis({ host: '127.0.0.1', port: 6379 });
    const pong = await redis.ping();
    await redis.quit();
    if (pong !== 'PONG') throw new Error();
  } catch (err) {
    throw new Error('Error: Redis is not responding');
  }
}

async function main() {
  try {
    loadEnv();
    await runDockerCompose();
    await waitForNeo4j();
    if (!(await isRedisRunning())) {
      await startRedis();
    } else {
      log('Redis is already running');
    }
    await verifyRedis();
    log('All services started!');
  } catch (err) {
    log(err.message);
    process.exit(1);
  }
}

main();

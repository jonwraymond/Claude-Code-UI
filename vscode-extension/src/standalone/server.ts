import * as path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { query } from '@anthropic-ai/claude-code';

const PROTO_PATH = path.join(__dirname, '..', '..', 'proto', 'claudecode.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const protoDescriptor = grpc.loadPackageDefinition(packageDef) as any;
const service = protoDescriptor.claudecode.ClaudeCode;

interface QueryRequest {
  prompt: string;
  options: Record<string, unknown>;
}

interface QueryResponse {
  type: string;
  content: string;
  is_error: boolean;
  session_id: string;
}

function queryHandler(call: grpc.ServerWritableStream<QueryRequest, QueryResponse>) {
  (async () => {
    try {
      for await (const message of query({ prompt: call.request.prompt, options: call.request.options })) {
        const resp: QueryResponse = {
          type: message.type,
          content: (message as any).message?.content || (message as any).result || '',
          is_error: (message as any).is_error || false,
          session_id: (message as any).session_id || '',
        };
        call.write(resp);
      }
    } catch (err) {
      const resp: QueryResponse = {
        type: 'error',
        content: err instanceof Error ? err.message : String(err),
        is_error: true,
        session_id: '',
      };
      call.write(resp);
    } finally {
      call.end();
    }
  })();
}

export function startServer(address = '127.0.0.1:50052') {
  const server = new grpc.Server();
  server.addService(service.service, { Query: queryHandler });
  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), err => {
    if (err) {
      console.error(`Failed to bind: ${err.message}`);
      return;
    }
    server.start();
    console.log(`Claude Code gRPC server listening on ${address}`);
  });
}

if (require.main === module) {
  startServer(process.env.CLAUDE_CODE_ADDR);
}

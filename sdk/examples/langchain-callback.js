import { RAGScope } from '@ragscope/sdk';

const ragscope = new RAGScope({
  endpoint: 'http://localhost:3000',
  defaultStrategy: 'auto',
});

/**
 * Example LangChain callback handler that captures RAG chain outputs.
 * Extend BaseCallbackHandler from @langchain/core/callbacks/base.
 *
 * class RagScopeCallbackHandler extends BaseCallbackHandler {
 *   name = 'ragscope';
 *
 *   constructor(ragscope) {
 *     super();
 *     this.ragscope = ragscope;
 *   }
 *
 *   async handleChainEnd(output, runId, parentRunId, tags) {
 *     if (output?.answer && output?.sourceDocuments) {
 *       this.ragscope.capture({
 *         input: output.query || '',
 *         actualOutput: output.answer,
 *         retrievalContext: output.sourceDocuments.map(d => d.pageContent),
 *         metadata: { runId, tags },
 *       });
 *     }
 *   }
 * }
 *
 * // Usage with a RetrievalQA chain:
 * const chain = RetrievalQAChain.fromLLM(model, retriever, {
 *   callbacks: [new RagScopeCallbackHandler(ragscope)],
 * });
 */

export { ragscope };

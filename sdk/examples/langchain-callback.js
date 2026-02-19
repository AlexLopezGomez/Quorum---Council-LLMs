import { Quorum } from '@quorum/sdk';

const quorum = new Quorum({
  endpoint: 'http://localhost:3000',
  defaultStrategy: 'auto',
});

/**
 * Example LangChain callback handler that captures RAG chain outputs.
 * Extend BaseCallbackHandler from @langchain/core/callbacks/base.
 *
 * class QuorumCallbackHandler extends BaseCallbackHandler {
 *   name = 'quorum';
 *
 *   constructor(quorum) {
 *     super();
 *     this.quorum = quorum;
 *   }
 *
 *   async handleChainEnd(output, runId, parentRunId, tags) {
 *     if (output?.answer && output?.sourceDocuments) {
 *       this.quorum.capture({
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
 *   callbacks: [new QuorumCallbackHandler(quorum)],
 * });
 */

export { quorum };

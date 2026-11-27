"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  UploadCloud,
  Search,
  Trash2,
  RefreshCw,
  Sparkles,
  FileCode,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { notify, apiFetch, apiRequest } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function KnowledgePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Queries
  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => apiFetch("/documents"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  // Reindex mutation
  const reindexMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/documents/${id}/reindex`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      notify("Document chunks successfully re-indexed in knowledge index.");
    },
  });

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if(file.size>4*1024*1024){setUploadError("Maximum file size is 4 MB");e.target.value="";return;}
    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("agentsphere_token");
    try {
      await apiRequest('/documents/upload',{method:'POST',body:formData});
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    } catch (err: any) {
      setUploadError(err.message || "Failed to process document");
    } finally {
      setIsUploading(false);
      e.target.value="";
    }
  };

  // Semantic Search Handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await apiFetch("/documents/search", {
        method: "POST",
        body: JSON.stringify({ query: searchQuery, top_k: 4 }),
      });
      setSearchResults(results);
    } catch (err: any) {
      notify(`Search failed: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-400" />
            <span>Knowledge Hub & RAG Vector Store</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Enterprise document ingestion, text extraction, pgvector embedding index, and semantic retrieval.
          </p>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Upload Zone & Semantic Search Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Dropzone */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white mb-1">Ingest Documents</h2>
            <p className="text-xs text-gray-400 mb-4">Supported formats: PDF, TXT, DOCX, CSV, and Markdown (Max 4MB)</p>

            <label className="border-2 border-dashed border-white/10 hover:border-violet-500/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-obsidian-850 hover:bg-obsidian-800 transition group">
              <UploadCloud className="w-10 h-10 text-gray-500 group-hover:text-violet-400 mb-3 transition" />
              <span className="text-xs font-semibold text-gray-200 group-hover:text-white">
                {isUploading ? "Uploading & Chunking..." : "Choose File or Drag & Drop"}
              </span>
              <span className="text-[10px] text-gray-500 mt-1">
                Extracted text is tokenized, embedded, and stored with tenant scoping.
              </span>
              <input
                type="file"
                disabled={isUploading}
                onChange={handleFileUpload}
                accept=".pdf,.txt,.docx,.csv,.md"
                className="hidden" aria-label="Field"
              />
            </label>
          </div>

          <div className="mt-4 flex items-center gap-2 text-[11px] text-gray-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tenant partition: {user?.organizationName} (100% Vector Isolated)</span>
          </div>
        </div>

        {/* Semantic Search Console */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white mb-1">Semantic Knowledge Retrieval Test</h2>
            <p className="text-xs text-gray-400 mb-4">Cosine similarity matching against indexed tenant chunks</p>

            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search policy, rate cards, limits, security..."
                className="flex-1 bg-obsidian-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" aria-label="Search policy, rate cards, limits, security..."
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </form>

            {/* Results Preview */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((res: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-obsidian-850 border border-white/5 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-indigo-300">
                        Match #{idx + 1} Ã¢â‚¬Â¢ {res.metadata?.filename || "Document"}
                      </span>
                      <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Score: {(res.similarity_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-gray-300 text-[11px] leading-relaxed line-clamp-2">
                      {res.content}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 text-xs">
                  Run a semantic search query to inspect matching chunks.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ingested Documents List */}
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-sm font-bold text-white mb-4">Indexed Knowledge Sources</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 text-gray-400">
                <th className="pb-3 font-medium">Filename</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Size</th>
                <th className="pb-3 font-medium">Total Chunks</th>
                <th className="pb-3 font-medium">Index Status</th>
                <th className="pb-3 font-medium">Added</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-400">Loading documents...</td>
                </tr>
              ) : (
                documents?.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-white/5 transition">
                    <td className="py-3 font-semibold text-white flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span>{doc.filename}</span>
                    </td>
                    <td className="py-3 uppercase font-mono text-gray-400">{doc.fileType}</td>
                    <td className="py-3 text-gray-400 font-mono">{(doc.fileSizeBytes / 1024).toFixed(1)} KB</td>
                    <td className="py-3 text-gray-300 font-mono font-medium">{doc.totalChunks} chunks</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">{new Date(doc.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 text-right space-x-2">
                      <button
                        onClick={() => reindexMutation.mutate(doc.id)}
                        title="Re-index Document"
                        className="p-1.5 rounded bg-obsidian-850 hover:bg-obsidian-800 text-gray-300 hover:text-white border border-white/5 transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(doc.id)}
                        title="Delete Document"
                        className="p-1.5 rounded bg-obsidian-850 hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-white/5 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

# 📋 Project Functions Reference

Tài liệu này liệt kê tất cả các functions, methods, và classes được sử dụng trong project EmbeddingAIFilesQuery.

---

## 📁 File Structure

```
src/
├── App.tsx                          (React Component chính)
├── main.tsx                         (Entry point)
└── services/
    ├── ChatEngine.ts               (Core chat engine logic)
    ├── DocumentProcessor.ts        (PDF/Text processing)
    ├── GeminiService.ts           (Gemini AI API integration)
    ├── VectorStore.ts             (Vector storage & search)
    └── CacheService.ts            (Embedding cache management)
```

---

## 🔧 Utility Functions

### **App.tsx**

#### `cn(...inputs: ClassValue[]): string`
- **Mục đích**: Merger CSS classes sử dụng `clsx` và `tailwind-merge`
- **Tham số**: 
  - `inputs`: Array các CSS class values
- **Return**: Merged CSS class string
- **Sử dụng**: Để combine Tailwind classes một cách an toàn
- **Ví dụ**: 
  ```typescript
  cn("px-4 py-2", isDark ? "bg-black" : "bg-white")
  ```

---

## 🏛️ Classes & Methods

### **1. ChatEngine Class** (`src/services/ChatEngine.ts`)

#### Properties
```typescript
private gemini: GeminiService        // Gemini API service
private vectorStore: VectorStore     // Vector storage
private docProcessor: DocumentProcessor  // Document processor
private cacheService: CacheService   // Cache management
private currentFileHash: string       // Current file hash
```

#### Methods

##### `constructor()`
- **Mục đích**: Khởi tạo ChatEngine với các services
- **Tham số**: Không
- **Return**: void

##### `async processFile(file: File): Promise<void>`
- **Mục đích**: Xử lý file (PDF, TXT, MD, CSV) và tạo embeddings
- **Logic**:
  1. Tính hash SHA-256 của file
  2. Kiểm tra cache trước
  3. Nếu có cache → load từ cache (nhanh)
  4. Nếu không → xử lý file → tạo embeddings → lưu cache
- **Tham số**: 
  - `file`: File cần xử lý
- **Return**: Promise<void>
- **Ví dụ**:
  ```typescript
  await chatEngine.processFile(pdfFile);
  ```

##### `clearContext(): void`
- **Mục đích**: Xóa context hiện tại (clear vector store)
- **Tham số**: Không
- **Return**: void
- **Sử dụng**: Khi user nhấn "Clear Session"

##### `async query(userQuery: string): Promise<ChatResponse>`
- **Mục đích**: Query matched documents dựa vào câu hỏi của user
- **Logic**:
  1. Embed câu hỏi user
  2. Tìm 5 document chunks tương tự nhất
  3. Combine context + images
  4. Gọi Gemini để generate response
- **Tham số**: 
  - `userQuery`: Câu hỏi của user
- **Return**: `{ answer: string, sources: Array }`
- **Ví dụ**:
  ```typescript
  const response = await chatEngine.query("What is in the document?");
  console.log(response.answer);
  ```

---

### **2. DocumentProcessor Class** (`src/services/DocumentProcessor.ts`)

#### Properties
```typescript
private chunkSize: number = 1000       // Kích thước mỗi chunk
private chunkOverlap: number = 200     // Overlap giữa chunks
```

#### Methods

##### `constructor(chunkSize?: number, chunkOverlap?: number)`
- **Mục đích**: Khởi tạo DocumentProcessor với custom chunk size
- **Tham số**:
  - `chunkSize`: Default 1000, kích thước mỗi text chunk
  - `chunkOverlap`: Default 200, overlap để không mất context
- **Return**: void

##### `async extractText(file: File): Promise<string>`
- **Mục đích**: Extract text từ file (PDF hoặc text file)
- **Logic**: Detect file type → gọi hàm phù hợp
- **Tham số**: 
  - `file`: File cần extract
- **Return**: Toàn bộ text được extract

##### `private async extractFromText(file: File): Promise<string>`
- **Mục đích**: Extract text từ .txt, .md, .csv files
- **Tham số**: File object
- **Return**: Text content

##### `private async extractFromPdf(file: File): Promise<{ text: string, pages: Array }>`
- **Mục đích**: Extract text AND images từ PDF
- **Logic**:
  1. Load PDF dùng pdfjs-dist
  2. Iterate qua từng page
  3. Extract text content
  4. Render page thành canvas → convert thành image (JPEG)
  5. Return text + array of { text, image, pageNumber }
- **Tham số**: PDF File object
- **Return**: Object chứa full text và array pages với images

##### `async process(file: File): Promise<{ chunks: Array }>`
- **Mục đích**: Main entry point - Process file thành chunks
- **Logic**:
  - PDF: Extract pages → tách mỗi page thành chunks + attach images
  - Text files: Extract text → tách thành chunks
- **Tham số**: File object
- **Return**: Object với array chunks `{ text, pageNumber?, image? }`
- **Ví dụ**:
  ```typescript
  const { chunks } = await docProcessor.process(file);
  ```

##### `chunkText(text: string): string[]`
- **Mục đích**: Chia text thành chunks với overlap
- **Logic**:
  1. Tách text thành chunks theo chunkSize
  2. Tìm điểm ngắt tự nhiên (dấu chấm, newline)
  3. Thêm overlap 200 ký tự để giữ context
  4. Filter out empty chunks
- **Tham số**: 
  - `text`: Text cần chia nhỏ
- **Return**: Array of chunked strings
- **Ví dụ**:
  ```typescript
  const chunks = docProcessor.chunkText(longText); // ["chunk1", "chunk2", ...]
  ```

---

### **3. VectorStore Class** (`src/services/VectorStore.ts`)

#### Properties
```typescript
private entries: VectorEntry[] = []   // Array lưu embedding entries
```

#### Methods

##### `constructor()`
- **Mục đích**: Khởi tạo empty vector store
- **Return**: void

##### `addEntries(entries: VectorEntry[]): void`
- **Mục đích**: Thêm vector entries vào store
- **Tham số**: 
  - `entries`: Array of VectorEntry (text + embedding + metadata)
- **Return**: void
- **Ví dụ**:
  ```typescript
  vectorStore.addEntries([
    { text: "chunk1", embedding: [...], metadata: {...} }
  ]);
  ```

##### `clear(): void`
- **Mục đích**: Xóa tất cả entries khỏi store
- **Tham số**: Không
- **Return**: void

##### `search(queryEmbedding: number[], topK: number = 5): VectorEntry[]`
- **Mục đích**: Tìm kiếm vector entries tương tự nhất
- **Logic**:
  1. Tính cosine similarity giữa query embedding và tất cả entries
  2. Sort theo similarity score (descending)
  3. Return top K kết quả
- **Tham số**:
  - `queryEmbedding`: Vector embedding của query
  - `topK`: Số kết quả trả về (default 5)
- **Return**: Array of K most similar VectorEntry
- **Ví dụ**:
  ```typescript
  const results = vectorStore.search(queryEmbedding, 5);
  ```

##### `private cosineSimilarity(vecA: number[], vecB: number[]): number`
- **Mục đích**: Tính cosine similarity giữa 2 vectors
- **Formula**: 
  - `similarity = (A·B) / (||A|| × ||B||)`
  - A·B = dot product
  - ||A|| = magnitude of A
- **Tham số**: 
  - `vecA`, `vecB`: 2 number arrays
- **Return**: Similarity score (0 to 1)

---

### **4. GeminiService Class** (`src/services/GeminiService.ts`)

#### Properties
```typescript
private ai: GoogleGenAI           // Gemini API client
private embeddingModel = "gemini-embedding-2-preview"  // Embedding model
private chatModel = "gemini-3-flash-preview"           // Chat model
```

#### Methods

##### `constructor()`
- **Mục đích**: Khởi tạo Gemini service với API key từ environment
- **Logic**: `new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })`
- **Return**: void

##### `async embed(text: string): Promise<number[]>`
- **Mục đích**: Tạo embedding vector cho 1 text
- **API**: Gemini Embedding 2 Model
- **Tham số**: 
  - `text`: Text cần embed
- **Return**: Array of embedding values (768 dimensions)
- **Ví dụ**:
  ```typescript
  const embedding = await geminiService.embed("Hello world");
  ```

##### `async embedBatch(texts: string[]): Promise<number[][]>`
- **Mục đích**: Batch embed multiple texts cùng lúc (hiệu quả hơn)
- **API**: Gemini Embedding 2 Model (batch processing)
- **Tham số**: 
  - `texts`: Array of texts
- **Return**: 2D array of embeddings
- **Ví dụ**:
  ```typescript
  const embeddings = await geminiService.embedBatch(["text1", "text2"]);
  ```

##### `async generateResponse(query: string, context: string, images: string[] = []): Promise<string>`
- **Mục đích**: Generate response từ Gemini dựa trên query + context + optional images
- **Logic**:
  1. Combine user prompt + context text + images
  2. Gọi Gemini API để generate response
  3. Return answer
- **Tham số**:
  - `query`: User question
  - `context`: Document context (text chunks kết hợp)
  - `images`: Optional array of image data URLs
- **Return**: Generated response string
- **Ví dụ**:
  ```typescript
  const answer = await geminiService.generateResponse(
    "What is this?",
    "Document text...",
    ["image1.jpg", "image2.jpg"]
  );
  ```

---

### **5. CacheService Class** (`src/services/CacheService.ts`)

#### Properties
```typescript
private readonly STORAGE_KEY = 'embedding_cache'  // localStorage key
private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024  // 50MB limit
```

#### Methods

##### `async calculateFileHash(file: File): Promise<string>`
- **Mục đích**: Tính SHA-256 hash của file để detect file changes
- **Logic**:
  1. Read file thành ArrayBuffer
  2. Use crypto.subtle.digest('SHA-256', buffer)
  3. Convert thành hex string
- **Tham số**: 
  - `file`: File object
- **Return**: Hex string hash (64 characters)
- **Ví dụ**:
  ```typescript
  const hash = await cacheService.calculateFileHash(pdfFile);
  ```

##### `getCachedEntries(fileHash: string): VectorEntry[] | null`
- **Mục đích**: Lấy cached embeddings nếu file đã được process
- **Logic**:
  1. Load cache từ localStorage
  2. Tìm entry với matching fileHash
  3. Return entries hoặc null
- **Tham số**: 
  - `fileHash`: File hash từ calculateFileHash()
- **Return**: VectorEntry[] nếu tìm thấy, null nếu không
- **Ví dụ**:
  ```typescript
  const cached = cacheService.getCachedEntries(fileHash);
  if (cached) console.log("Cache hit!");
  ```

##### `saveEntries(fileHash: string, fileName: string, entries: VectorEntry[]): void`
- **Mục đích**: Lưu embeddings vào cache (localStorage)
- **Logic**:
  1. Load existing cache
  2. Remove old entry với same hash
  3. Add new entry
  4. Check size → remove oldest nếu exceed 50MB
  5. Save to localStorage
- **Tham số**:
  - `fileHash`: Unique file hash
  - `fileName`: File name (for reference)
  - `entries`: VectorEntry array
- **Return**: void

##### `private getCache(): CachedDocument[]`
- **Mục đích**: Internal method để load cache từ localStorage
- **Return**: Array of cached documents

##### `clearCache(): void`
- **Mục đích**: Xóa toàn bộ cache
- **Logic**: `localStorage.removeItem(STORAGE_KEY)`
- **Return**: void

##### `getCacheStats(): { count: number, size: string }`
- **Mục đích**: Get cache statistics
- **Return**: 
  - `count`: Số documents trong cache
  - `size`: Size in MB
- **Ví dụ**:
  ```typescript
  const stats = cacheService.getCacheStats();
  console.log(`${stats.count} files, ${stats.size}`);
  ```

---

## 🎨 React Components

### **App.tsx - Main Component**

#### State
```typescript
const [messages, setMessages]           // Chat messages array
const [input, setInput]                 // Input text
const [isProcessing, setIsProcessing]   // Loading state
const [isUploading, setIsUploading]     // Upload state
const [currentFile, setCurrentFile]     // Current file
const [error, setError]                 // Error message
const [selectedImage, setSelectedImage] // Zoomed image
```

#### Key Functions

##### `onDrop(acceptedFiles: File[]): Promise<void>`
- **Mục đích**: Handle file drop (drag & drop)
- **Logic**:
  1. Get first file
  2. Set uploading state
  3. Call chatEngine.processFile()
  4. Show welcome message
  5. Handle errors
- **Tham số**: Files dropped từ drag & drop
- **Return**: Promise

##### `handleSendMessage(e?: React.FormEvent): Promise<void>`
- **Mục đích**: Handle user message submission
- **Logic**:
  1. Validate input
  2. Add user message to chat
  3. Call chatEngine.query()
  4. Extract images từ response
  5. Display assistant response
- **Tham số**: Optional form event
- **Return**: Promise

##### `clearChat(): void`
- **Mục đđộng**: Clear current session
- **Logic**:
  1. Clear messages
  2. Clear current file
  3. Call chatEngine.clearContext()
- **Return**: void

---

## 📊 Data Types & Interfaces

### **ChatResponse** (ChatEngine.ts)
```typescript
interface ChatResponse {
  answer: string                                    // AI response
  sources: { text: string; pageNumber?: number; image?: string }[]  // Source references
}
```

### **Message** (App.tsx)
```typescript
interface Message {
  id: string                     // Unique ID
  role: 'user' | 'assistant'    // Message role
  content: string               // Message content
  timestamp: Date              // When sent
  images?: string[]            // Optional images
}
```

### **VectorEntry** (VectorStore.ts)
```typescript
interface VectorEntry {
  text: string          // Original text
  embedding: number[]   // Vector (768 dimensions)
  metadata?: any        // Metadata (fileName, pageNumber, image, etc)
}
```

### **CachedDocument** (CacheService.ts)
```typescript
interface CachedDocument {
  fileHash: string      // SHA-256 hash
  fileName: string      // Original file name
  entries: VectorEntry[]  // Cached embeddings
  timestamp: number     // When cached
}
```

---

## 🔄 Function Call Flow

### 1️⃣ **File Upload Flow**
```
User drops file
    ↓
App.onDrop()
    ↓
ChatEngine.processFile(file)
    ↓
CacheService.calculateFileHash() → Check cache
    ├─ If cached: Load entries from cache ✅ (FAST)
    └─ If not:
         ↓
         DocumentProcessor.process()
           ├─ extractFromPdf() OR extractFromText()
           ├─ chunkText()
           └─ Return chunks with images
         ↓
         GeminiService.embedBatch() → Create embeddings
         ↓
         VectorStore.addEntries()
         ↓
         CacheService.saveEntries() → Save to cache 💾
```

### 2️⃣ **Query Flow**
```
User sends message
    ↓
App.handleSendMessage()
    ↓
ChatEngine.query(userQuery)
    ├─ GeminiService.embed() → Embed query
    ├─ VectorStore.search() → Find similar chunks (cosine similarity)
    ├─ GeminiService.generateResponse() → Generate answer with context + images
    └─ Return { answer, sources }
    ↓
App displays response + images
```

---

## 📦 Supported File Types

| Format | Extension | Processing |
|--------|-----------|-----------|
| PDF | `.pdf` | Extract text + render pages as images |
| Text | `.txt` | Extract text only |
| Markdown | `.md` | Extract text only |
| CSV | `.csv` | Extract text only |

---

## ⚙️ Configuration

### Environment Variables
```env
GEMINI_API_KEY=your_api_key_here    # Required for Gemini API
APP_URL=http://localhost:3000       # App URL for callbacks
```

### Cache Settings
- **Storage**: Browser localStorage
- **Max Size**: 50MB
- **Strategy**: Oldest files removed when limit exceeded

### Processing Settings
- **Chunk Size**: 1000 characters
- **Chunk Overlap**: 200 characters
- **Search Results**: Top 5 most relevant chunks
- **Embedding Model**: gemini-embedding-2-preview (768 dimensions)
- **Chat Model**: gemini-3-flash-preview

---

## 🎯 Main Workflows

### Workflow 1: First Time Using (No Cache)
```
1. Upload PDF
2. App calculates file hash
3. No cache found → Process file
4. Extract text + images
5. Create embeddings (uses Gemini API)
6. Save to cache
7. Show "Ready for queries"
```

### Workflow 2: Using Cached File
```
1. Upload same PDF
2. App calculates file hash
3. Cache found! ✅
4. Load embeddings instantly
5. Show "Ready for queries" (much faster!)
6. No API calls needed
```

### Workflow 3: Asking Questions
```
1. User types question
2. Create embedding for question
3. Search for 5 similar chunks
4. Combine chunks + images
5. Send to Gemini with context
6. Display response + source images
7. User can click images to zoom
```

---

## 📚 API References

### Gemini API Models
- **Embedding**: `gemini-embedding-2-preview`
  - Input: Text
  - Output: 768-dimensional vector
  
- **Chat**: `gemini-3-flash-preview`
  - Input: Text + Optional Images
  - Output: Text response

### PDF Processing
- **Library**: `pdfjs-dist`
- **Features**: Extract text, render pages, convert to images

---

**Generated on**: 23/03/2026  
**Project**: EmbeddingAIFilesQuery  
**Version**: 1.0

import axios from 'axios';
import {
  FileAudio,
  FileIcon,
  FileImage,
  FileText,
  FileVideo,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';

type FileWithProgress = {
  id: string;
  file: File;
  progress: number;
  uploaded: boolean;
};

export default function FileUpload() {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [uploading, setUploading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).map((file) => ({
      file,
      progress: 0,
      uploaded: false,
      id: file.name,
    }));
    setFiles([...files, ...newFiles]);
    if (inputRef.current) {
      inputRef.current.value = ''; // Clear the input after selection
    }
  }

  function removeFile(id: string) {
    setFiles(files.filter((file) => file.id !== id));
  }

  function handleClear() {
    setFiles([]);
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);

    const uploadPromise = files.map(async (fileWithUpload) => {
      const formData = new FormData();
      formData.append('file', fileWithUpload.file);

      try {
        await axios.post('https://httpbin.org/post', formData, {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1),
            );
            setFiles((prevFiles) =>
              prevFiles.map((f) =>
                f.id === fileWithUpload.id ? { ...f, progress } : f,
              ),
            );
          },
        });
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileWithUpload.id ? { ...f, uploaded: true } : f,
          ),
        );
      } catch (error) {
        console.error('Upload failed:', error);
      }
    });
    await Promise.all(uploadPromise);
    setUploading(false);
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <h2 className="flex items-center justify-center text-xl font-bold">
          File Upload
        </h2>
        <div className="flex items-center justify-center gap-2">
          <FileInput
            inputRef={inputRef}
            disabled={uploading}
            onFileSelect={handleFileSelect}
          />
          <ActionButtons
            disabled={uploading || files.length === 0}
            onUpload={handleUpload}
            onClear={handleClear}
          />
        </div>
        <FileList files={files} onRemove={removeFile} uploading={uploading} />
      </div>
    </>
  );
}

// File input component

type FileInputProps = {
  inputRef: React.RefObject<HTMLInputElement>;
  disabled: boolean;
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
};

function FileInput({ inputRef, disabled, onFileSelect }: FileInputProps) {
  return (
    <>
      <input
        type="file"
        ref={inputRef}
        onChange={onFileSelect}
        multiple
        className="hidden"
        id="file-upload"
        disabled={disabled}
      />
      <label
        htmlFor="file-upload"
        className="flex cursor-pointer items-center gap-2 rounded-md bg-grayscale-700 px-6 py-2 hover:opacity-90"
      >
        <Plus size={18} />
        Select Files
      </label>
    </>
  );
}

type ActionBtnProps = {
  disabled: boolean;
  onUpload: () => void;
  onClear: () => void;
};

function ActionButtons({ disabled, onUpload, onClear }: ActionBtnProps) {
  return (
    <>
      <button
        onClick={onUpload}
        disabled={disabled}
        className="flex items-center gap-2"
      >
        <Upload size={18} /> Upload
      </button>
      <button
        onClick={onClear}
        disabled={disabled}
        className="flex  items-center gap-2"
      >
        <X size={18} /> Clear All
      </button>
    </>
  );
}

type FileListProps = {
  files: FileWithProgress[];
  onRemove: (id: string) => void;
  uploading: boolean;
};

function FileList({ files, onRemove, uploading }: FileListProps) {
  if (files.length === 0) return null;
  return (
    <>
      {' '}
      <div className="space-y-2">
        <h3 className="font-semibold">Files:</h3>
        <div className="space-y-2">
          {files.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              onRemove={onRemove}
              uploading={uploading}
            />
          ))}
        </div>
      </div>
    </>
  );
}

type FileItemProps = {
  file: FileWithProgress;
  onRemove: (id: string) => void;
  uploading: boolean;
};
function FileItem({ file, onRemove, uploading }: FileItemProps) {
  const Icon = getFileIcon(file.file.type);

  return (
    <div className="space-y-2 rounded-md bg-grayscale-700 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Icon size={40} className="text-primary-500" />
          <div className="flex flex-col">
            <span className="font-medium">{file.file.name}</span>
            <div className="flex items-center gap-2 text-xs text-grayscale-400">
              <span>{formatFileSize(file.file.size)}</span>
              <span>•</span>
              <span>{file.file.type || 'Unknown type'}</span>
            </div>
          </div>
        </div>
        {!uploading && (
          <button onClick={() => onRemove(file.id)} className="bg-none p-0">
            <X size={16} className="text-white" />
          </button>
        )}
      </div>
      <div className="text-right text-xs">
        {file.uploaded ? 'Completed' : `${Math.round(file.progress)}%`}
      </div>
      <ProgressBar progress={file.progress} />
    </div>
  );
}

type ProgressBarProps = {
  progress: number;
};

function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-grayscale-800">
      <div
        className="h-full bg-primary-500 transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// Helper funtions
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.startsWith('audio/')) return FileAudio;
  if (mimeType === 'application/pdf') return FileText;
  return FileIcon;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

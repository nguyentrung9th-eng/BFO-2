import React, { useCallback, useRef } from 'react';
import './FileUploader.css';

interface FileUploaderProps {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  onFilesChanged?: () => void;
}

const ACCEPTED_TYPES = '.pdf,.xml,image/*';

const FileUploader: React.FC<FileUploaderProps> = ({ files, setFiles, onFilesChanged }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFilesToList = useCallback(
    (incoming: File[]) => {
      setFiles((prev) => {
        const newFiles = [...prev];
        incoming.forEach((file) => {
          if (!newFiles.some((f) => f.name === file.name)) {
            newFiles.push(file);
          } else {
            alert(`File "${file.name}" đã tồn tại trong danh sách!`);
          }
        });
        return newFiles;
      });
    },
    [setFiles]
  );

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-active');
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('drag-active');
  };

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.classList.remove('drag-active');
      const droppedFiles = Array.from(e.dataTransfer.files);
      addFilesToList(droppedFiles);
    },
    [addFilesToList]
  );

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFilesToList(Array.from(e.target.files));
      // Reset input để cho phép chọn lại cùng file
      e.target.value = '';
    }
  };

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    if (onFilesChanged) onFilesChanged();
  };

  const removeAllFiles = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả các file đã tải lên?')) {
      setFiles([]);
      if (onFilesChanged) onFilesChanged();
    }
  };

  return (
    <div className="uploader-container">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES}
        style={{ display: 'none' }}
        onChange={onFileInputChange}
        id="file-input-hidden"
      />

      <div
        className="drop-zone"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        title="Nhấn để chọn file hoặc kéo thả vào đây"
      >
        <div className="drop-content">
          <div className="drop-icon">📂</div>
          <p className="drop-main-text">Kéo thả hoặc nhấn để chọn File</p>
          <p className="drop-sub-text">Hỗ trợ: PDF, XML, Ảnh hóa đơn (PNG, JPG, ...)</p>
          <button
            type="button"
            className="btn-browse"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            📂 Chọn file từ máy tính
          </button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="file-list-container">
          <div className="file-list-header">
            <h3>Danh sách hóa đơn ({files.length})</h3>
            <button className="btn-danger" onClick={removeAllFiles}>
              Xóa tất cả
            </button>
          </div>
          <ul className="file-list">
            {files.map((f, i) => (
              <li key={i} className="file-item">
                <span className="file-name">{f.name}</span>
                <div className="file-actions">
                  <button
                    className="btn-primary"
                    style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem' }}
                    onClick={() => {
                      if ((window as any).openModal) {
                        (window as any).openModal(f);
                      }
                    }}
                  >
                    Xác nhận
                  </button>
                  <button
                    className="btn-remove"
                    onClick={() => removeFile(f.name)}
                  >
                    Xóa
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUploader;

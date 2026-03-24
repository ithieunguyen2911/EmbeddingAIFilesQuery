import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Trash2, ChevronRight } from 'lucide-react';
import { Group } from '../types/workspace';
import { formatDistanceToNow } from '../utils/format';

interface GroupCardProps {
  group: Group;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ group, onClick, onDelete }) => {
  const documentCount = group.documents.length;

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer bg-white rounded-lg border border-slate-200 p-6 transition-all hover:border-blue-300"
    >
      {/* Header with icon and menu */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">{group.name}</h3>
          {group.description && (
            <p className="text-sm text-slate-600 line-clamp-2">{group.description}</p>
          )}
        </div>

        {/* Delete button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors ml-2"
        >
          <Trash2 size={18} />
        </motion.button>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 mb-4" />

      {/* Footer with document count and date */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <FileText size={16} className="text-blue-500" />
          <span>{documentCount} document{documentCount !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors">
          <span className="text-xs">
            {formatDistanceToNow(group.createdAt)}
          </span>
          <ChevronRight size={16} />
        </div>
      </div>
    </motion.div>
  );
};

export default GroupCard;

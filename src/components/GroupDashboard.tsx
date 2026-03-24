import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGroupContext } from '../context/GroupContext';
import { CreateGroupModal } from './CreateGroupModal';
import GroupCard from './GroupCard';

export const GroupDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useGroupContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter groups based on search
  const filteredGroups = state.groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle group selection
  const handleGroupSelect = (groupId: string) => {
    dispatch({ type: 'SET_CURRENT_GROUP', payload: groupId });
    navigate(`/group/${groupId}`);
  };

  // Handle group deletion
  const handleGroupDelete = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this group and all its documents?')) {
      dispatch({ type: 'DELETE_GROUP', payload: groupId });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center"
          >
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Workspace</h1>
              <p className="text-slate-600 mt-1">Organize and analyze your documents in groups</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              <Plus size={20} />
              New Group
            </button>
          </motion.div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
      </div>

      {/* Groups Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {filteredGroups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-slate-400 text-6xl mb-4">📁</div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              {state.groups.length === 0 ? 'No groups yet' : 'No groups match your search'}
            </h3>
            <p className="text-slate-600">
              {state.groups.length === 0
                ? 'Create your first group to get started'
                : 'Try a different search term'}
            </p>
            {state.groups.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create First Group
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredGroups.map((group, index) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GroupCard
                  group={group}
                  onClick={() => handleGroupSelect(group.id)}
                  onDelete={(e) => handleGroupDelete(group.id, e)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};

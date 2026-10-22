import React, { useState, useEffect } from 'react';
import { Plus, Sprout, Droplets, Thermometer, Gauge, Edit2, Trash2, ShieldCheck } from 'lucide-react';
import { api } from '../services/api.js';
import { Field, Farm, Crop } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import { Badge } from '../components/ui/Badge.js';

export const FieldsPage: React.FC = () => {
  const { canEdit } = useAuth();
  const [fields, setFields] = useState<Field[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [selectedFarmId, setSelectedFarmId] = useState<string>('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [formData, setFormData] = useState({
    farmId: '',
    name: '',
    area: '',
    cropId: '',
    moistureThreshold: '35',
    irrigationEnabled: true,
  });

  const [deleteTarget, setDeleteTarget] = useState<Field | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [farmsRes, cropsRes] = await Promise.all([api.farms.list(), api.crops.list()]);
      setFarms(farmsRes.farms || []);
      setCrops(cropsRes.crops || []);

      // Fetch all fields for available farms
      const allFields: Field[] = [];
      for (const farm of farmsRes.farms || []) {
        const fieldRes = await api.fields.listByFarm(farm.id);
        allFields.push(
          ...(fieldRes.fields || []).map((f: any) => ({
            ...f,
            farm: { id: farm.id, name: farm.name },
          }))
        );
      }
      setFields(allFields);
    } catch (e) {
      console.error('Failed to load fields data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingField(null);
    setFormData({
      farmId: farms[0]?.id || '',
      name: '',
      area: '',
      cropId: crops[0]?.id || '',
      moistureThreshold: '35',
      irrigationEnabled: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (field: Field) => {
    setEditingField(field);
    setFormData({
      farmId: field.farmId,
      name: field.name,
      area: field.area.toString(),
      cropId: field.cropId || '',
      moistureThreshold: field.moistureThreshold.toString(),
      irrigationEnabled: field.irrigationEnabled,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingField) {
        await api.fields.update(editingField.id, formData);
      } else {
        await api.fields.create(formData.farmId, formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to save field');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.fields.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete field');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredFields =
    selectedFarmId === 'ALL' ? fields : fields.filter((f) => f.farmId === selectedFarmId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cultivated Fields & Crops</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage field sectors, optimal crop moisture boundaries, and automated irrigation configurations.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {farms.length > 1 && (
            <select
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Farms ({fields.length} Fields)</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          )}

          {canEdit && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Field</span>
            </button>
          )}
        </div>
      </div>

      {/* Fields Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredFields.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <Sprout className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No fields found</h3>
          <p className="text-xs text-slate-500 mt-1">Add fields to start deploying sensors and managing irrigation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFields.map((field) => (
            <div
              key={field.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-emerald-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <Sprout className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">{field.name}</h3>
                      <span className="text-xs text-slate-400 font-medium">{field.farm?.name}</span>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(field)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(field)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Crop Information Banner */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{field.crop?.name || 'Unassigned Crop'}</span>
                    <Badge variant="emerald" size="sm">
                      {field.area} ha
                    </Badge>
                  </div>
                  {field.crop && (
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{field.crop.description}</p>
                  )}
                </div>

                {/* Agronomic Thresholds */}
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-blue-500" />
                      Moisture Trigger:
                    </span>
                    <span className="font-bold text-slate-800">&lt; {field.moistureThreshold}%</span>
                  </div>

                  {field.crop && (
                    <>
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                          Optimal Temp:
                        </span>
                        <span className="font-semibold text-slate-700">
                          {field.crop.optimalMinTemp}°C - {field.crop.optimalMaxTemp}°C
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-purple-500" />
                          Optimal pH:
                        </span>
                        <span className="font-semibold text-slate-700">
                          {field.crop.optimalMinPh} - {field.crop.optimalMaxPh}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Irrigation Actuator:</span>
                <Badge variant={field.irrigationEnabled ? 'emerald' : 'slate'} size="sm">
                  {field.irrigationEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {editingField ? 'Configure Field' : 'Add Cultivated Field'}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Parent Farm
                </label>
                <select
                  required
                  value={formData.farmId}
                  onChange={(e) => setFormData({ ...formData, farmId: e.target.value })}
                  disabled={!!editingField}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Field Sector Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="North Corn Sector"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Area (Hectares)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="18.0"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Planted Crop
                  </label>
                  <select
                    value={formData.cropId}
                    onChange={(e) => setFormData({ ...formData, cropId: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="">Unassigned</option>
                    {crops.map((crop) => (
                      <option key={crop.id} value={crop.id}>
                        {crop.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Auto Irrigation Moisture Trigger (%)
                </label>
                <input
                  type="number"
                  min="5"
                  max="80"
                  required
                  value={formData.moistureThreshold}
                  onChange={(e) => setFormData({ ...formData, moistureThreshold: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Automatic replenishment activates when soil moisture dips below this value.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="irrigationEnabled"
                  checked={formData.irrigationEnabled}
                  onChange={(e) => setFormData({ ...formData, irrigationEnabled: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="irrigationEnabled" className="text-xs font-semibold text-slate-700">
                  Allow Precision Irrigation Actuation
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  {editingField ? 'Save Changes' : 'Create Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Field"
        message={`Delete field "${deleteTarget?.name}"? All assigned sensors and telemetry records will be permanently removed.`}
        confirmLabel="Delete Field"
        variant="danger"
        isProcessing={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnitStore } from '../../store/unitStore';
import { useAuthStore } from '../../store/authStore';
import { useRotationStore, calculateResidentYearForAcademicYear } from '../../store/rotationStore';
import { AVAILABLE_COLORS, getColor } from '../../utils/constants';
import { Trash2, Plus, Edit2, X, Check, FileSpreadsheet, Download, Eye, Shield, LayoutGrid, Key, Bell } from 'lucide-react';
import clsx from 'clsx';
import { getNotificationConfig, saveNotificationConfig, sendTelegramMessage } from '../../services/notifications';

const Settings: React.FC = () => {
  const { 
    role, 
    adminEmails, 
    addAdmin, 
    removeAdmin, 
    readers, 
    fetchReaders, 
    addReader, 
    removeReader 
  } = useAuthStore();
  const isAdmin = role === 'admin';
  const { units, addUnit, updateUnit, deleteUnit } = useUnitStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchReaders();
  }, [fetchReaders]);

  const handleExportPDF = () => {
    localStorage.setItem('trigger-print', 'true');
    navigate('/dashboard');
  };

  const [activeTab, setActiveTab] = useState<'units' | 'readers' | 'admins' | 'notifications'>('units');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [color, setColor] = useState(AVAILABLE_COLORS[0].id);
  const [type, setType] = useState<'interna' | 'interna-hjsd' | 'externa'>('interna');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newReaderUser, setNewReaderUser] = useState('');
  const [newReaderPass, setNewReaderPass] = useState('');
  const [newReaderRole, setNewReaderRole] = useState<'reader' | 'coordinador'>('reader');

  // Notifications configuration state
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [isSavingNotif, setIsSavingNotif] = useState(false);
  const [isTestingNotif, setIsTestingNotif] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    const loadNotifConfig = async () => {
      const config = await getNotificationConfig();
      setNotifEnabled(config.enabled);
      setTelegramBotToken(config.telegramBotToken);
      setTelegramChatId(config.telegramChatId);
    };
    loadNotifConfig();
  }, []);

  const handleSaveNotifications = async () => {
    setIsSavingNotif(true);
    await saveNotificationConfig({
      enabled: notifEnabled,
      telegramBotToken: telegramBotToken.trim(),
      telegramChatId: telegramChatId.trim()
    });
    setIsSavingNotif(false);
    alert('Configuración de notificaciones guardada correctamente.');
  };

  const handleTestNotification = async () => {
    setIsTestingNotif(true);
    setTestResult(null);
    const ok = await sendTelegramMessage(
      '🔔 <b>Prueba de Notificación:</b> ¡El bot de Telegram está configurado correctamente en COT Sync!',
      {
        enabled: true,
        telegramBotToken: telegramBotToken.trim(),
        telegramChatId: telegramChatId.trim()
      }
    );
    setIsTestingNotif(false);
    if (ok) {
      setTestResult({ success: true, message: 'Mensaje de prueba enviado con éxito. Comprueba tu Telegram.' });
    } else {
      setTestResult({ success: false, message: 'Error al enviar el mensaje de prueba. Verifica el Token del Bot y el Chat ID.' });
    }
  };

  const handleExportExcel = () => {
    const { residents, rotations } = useRotationStore.getState();
    const { units } = useUnitStore.getState();

    // Group academic start years from rotations
    const academicStartYears = Array.from(new Set(
      rotations.map(r => r.month >= 5 ? r.year : r.year - 1)
    ));
    if (academicStartYears.length === 0) {
      academicStartYears.push(new Date().getMonth() < 4 ? new Date().getFullYear() - 1 : new Date().getFullYear());
    }
    academicStartYears.sort((a, b) => a - b);

    const csvRows: string[] = [];

    academicStartYears.forEach(academicYear => {
      // 1. Title Row for Academic Year Blackboard
      csvRows.push(`PIZARRA DE ROTACIONES - CURSO ${academicYear}/${academicYear + 1};;;;;;;;;;;;;`);
      
      // 2. Column Headers
      csvRows.push([
        'Residente',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo'
      ].join(';'));

      // 3. Collect and sort residents by level (R5 -> R4 -> R3 -> R2 -> R1)
      const residentRowsWithLevels = residents
        .filter(r => !r.id.startsWith('temp-'))
        .map(resident => {
          const level = calculateResidentYearForAcademicYear(resident.startDate, academicYear);
          return { resident, level };
        });

      const levelRank: Record<string, number> = { 'R5': 5, 'R4': 4, 'R3': 3, 'R2': 2, 'R1': 1, 'Graduado': 0 };
      residentRowsWithLevels.sort((a, b) => (levelRank[b.level] || 0) - (levelRank[a.level] || 0));

      residentRowsWithLevels.forEach(({ resident, level }) => {
        const levelPrefix = level !== 'Graduado' ? `[${level}] ` : '';
        const residentLabel = `${levelPrefix}${resident.firstName} ${resident.lastName}`;
        const rowData = [residentLabel];

        const academicMonthIndices = [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4];
        academicMonthIndices.forEach(monthIndex => {
          const calendarYear = monthIndex >= 5 ? academicYear : academicYear + 1;
          const rot = rotations.find(
            r => r.residentId === resident.id && r.month === monthIndex && r.year === calendarYear
          );

          if (rot) {
            const u = units.find(unit => unit.id === rot.unitId);
            let unitName = u ? u.name : 'Desconocida';
            if (rot.isVacation) {
              unitName += ' (Vacaciones)';
            }
            rowData.push(unitName);
          } else {
            rowData.push('-');
          }
        });

        csvRows.push(rowData.join(';'));
      });

      // 4. Blank separating lines
      csvRows.push(';;;;;;;;;;;;;');
      csvRows.push(';;;;;;;;;;;;;');
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Pizarra_Rotaciones_Completa_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">No tienes permisos para ver esta página.</p>
      </div>
    );
  }

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName('');
    setColor(AVAILABLE_COLORS[0].id);
    setType('interna');
  };

  const handleEdit = (id: string) => {
    const unit = units.find(u => u.id === id);
    if (unit) {
      setName(unit.name);
      setColor(unit.color); // unit.color is now a colorId string
      setType(unit.type ?? 'interna');
      setEditingId(id);
      setIsAdding(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editingId) {
      updateUnit(editingId, { name, color, type });
    } else {
      addUnit({ name, color, type });
    }
    resetForm();
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Ajustes</h2>
        <p className="text-slate-500 text-sm mt-1">
          Configuración de las especialidades médicas, rotaciones y perfiles de acceso.
        </p>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('units')}
          className={clsx(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 select-none",
            activeTab === 'units'
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          Especialidades y Exportación
        </button>
        <button
          onClick={() => setActiveTab('readers')}
          className={clsx(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 select-none",
            activeTab === 'readers'
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          <Eye className="w-4 h-4" />
          Perfiles de Residente
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={clsx(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 select-none",
            activeTab === 'admins'
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          <Shield className="w-4 h-4" />
          Administradores
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={clsx(
            "pb-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 select-none",
            activeTab === 'notifications'
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          <Bell className="w-4 h-4" />
          Notificaciones Telegram
        </button>
      </div>

      {activeTab === 'units' && (
        <div className="space-y-8 animate-fadeIn">
          {/* MEDICAL UNITS SECTION */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Unidades Médicas</h3>
              {!isAdding && !editingId && (
                <button 
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Añadir Unidad
                </button>
              )}
            </div>

            <div className="p-6">
              {(isAdding || editingId) && (
                <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 mb-8">
                  <h4 className="font-semibold text-slate-800 mb-4">
                    {editingId ? 'Editar Unidad' : 'Nueva Unidad'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Unidad</label>
                        <input 
                          type="text" 
                          value={name} 
                          onChange={e => setName(e.target.value)} 
                          className="w-full border border-slate-350 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                          placeholder="Ej. Traumatología Deportiva" 
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de Rotación</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setType('interna')}
                            className={clsx(
                              "flex-1 py-2 px-3 border rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
                              type === 'interna'
                                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            Interna
                          </button>
                          <button
                            type="button"
                            onClick={() => setType('interna-hjsd')}
                            className={clsx(
                              "flex-1 py-2 px-3 border rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
                              type === 'interna-hjsd'
                                ? "bg-slate-700 border-slate-700 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            Interna HJSD
                          </button>
                          <button
                            type="button"
                            onClick={() => setType('externa')}
                            className={clsx(
                              "flex-1 py-2 px-3 border rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
                              type === 'externa'
                                ? "bg-amber-600 border-amber-600 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            Externa
                          </button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Color Identificativo</label>
                      <div className="grid grid-cols-10 gap-1 bg-white p-2.5 border border-slate-200 rounded-lg max-w-sm">
                        {Array.from({ length: 6 }).map((_, shadeIdx) => {
                          const colorFamilies = [
                            AVAILABLE_COLORS.slice(0, 6),   // Rojo
                            AVAILABLE_COLORS.slice(6, 12),  // Naranja
                            AVAILABLE_COLORS.slice(12, 18), // Amarillo
                            AVAILABLE_COLORS.slice(18, 24), // Verde
                            AVAILABLE_COLORS.slice(24, 30), // Cian
                            AVAILABLE_COLORS.slice(30, 36), // Aciano
                            AVAILABLE_COLORS.slice(36, 42), // Azul
                            AVAILABLE_COLORS.slice(42, 48), // Púrpura
                            AVAILABLE_COLORS.slice(48, 54), // Magenta
                            AVAILABLE_COLORS.slice(54, 60), // Gris
                          ];

                          return (
                            <React.Fragment key={shadeIdx}>
                              {colorFamilies.map((familyColors) => {
                                const c = familyColors[shadeIdx];
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    title={c.label}
                                    onClick={() => setColor(c.id)}
                                    className={clsx(
                                      "w-6 h-6 rounded-md border transition-transform cursor-pointer",
                                      c.bg,
                                      c.border,
                                      color === c.id ? 'scale-110 ring-2 ring-offset-1 ring-blue-500 z-10 border-white shadow-md' : 'hover:scale-110'
                                    )}
                                  />
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        Gama cromática de Google Sheets: Columnas por familias de color, filas por niveles de intensidad.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button onClick={resetForm} className="flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
                      <X className="w-4 h-4" /> Cancelar
                    </button>
                    <button onClick={handleSave} disabled={!name.trim()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">
                      <Check className="w-4 h-4" /> Guardar
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {units.map(unit => (
                  <div key={unit.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className={clsx("w-6 h-6 rounded-full border-2", getColor(unit.color).bg, getColor(unit.color).border)}></span>
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-slate-800 text-sm">{unit.name}</span>
                        <span className={clsx(
                          "text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border tracking-wider select-none",
                          unit.type === 'interna-hjsd' && "bg-slate-100 text-slate-700 border-slate-350",
                          unit.type === 'externa' && "bg-amber-50 text-amber-700 border-amber-250",
                          (!unit.type || unit.type === 'interna') && "bg-blue-50 text-blue-700 border-blue-200"
                        )}>
                          {unit.type === 'interna-hjsd' ? 'Interna HJSD' : unit.type === 'externa' ? 'Externa' : 'Interna'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          handleEdit(unit.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 rounded-md cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if(window.confirm('¿Borrar esta unidad? Se eliminará la posibilidad de añadirla, pero no borrará las existentes en la pizarra.')) {
                            deleteUnit(unit.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 rounded-md cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* EXPORT DATA SECTION */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Exportar Pizarra de Rotaciones</h3>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">Descargar Histórico Completo</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Genera y descarga un archivo de Excel (.csv con separador de punto y coma) con todas las rotaciones programadas de todos los residentes para todos los años académicos.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-lg transition-all duration-200 cursor-pointer select-none"
                  >
                    <Download className="w-4 h-4" />
                    Exportar a Excel
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-red-500/10 hover:shadow-lg transition-all duration-200 cursor-pointer select-none"
                  >
                    <Download className="w-4 h-4" />
                    Exportar a PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'readers' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Perfiles de Residente</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Crea cuentas de consulta para residentes con privilegios de solo lectura (sin permisos de edición en la pizarra).
            </p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Usuario o Correo</label>
                <input 
                  type="text" 
                  value={newReaderUser} 
                  onChange={e => setNewReaderUser(e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm" 
                  placeholder="ej. residente1 o email" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Contraseña</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input 
                    type="password" 
                    value={newReaderPass} 
                    onChange={e => setNewReaderPass(e.target.value)} 
                    className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm" 
                    placeholder="Contraseña del residente" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Rol de Acceso</label>
                <div className="flex gap-2">
                  <select 
                    value={newReaderRole} 
                    onChange={e => setNewReaderRole(e.target.value as 'reader' | 'coordinador')}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm text-slate-700"
                  >
                    <option value="reader">Residente (Solo Lectura)</option>
                    <option value="coordinador">Coordinador (Edita Guardias)</option>
                  </select>
                  <button 
                    onClick={async () => {
                      if (newReaderUser.trim() && newReaderPass.trim()) {
                        await addReader(newReaderUser.trim().toLowerCase(), newReaderPass.trim(), newReaderRole);
                        setNewReaderUser('');
                        setNewReaderPass('');
                        setNewReaderRole('reader');
                      }
                    }}
                    disabled={!newReaderUser.trim() || !newReaderPass.trim()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 cursor-pointer select-none shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Añadir
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {readers.length === 0 ? (
                <p className="text-slate-400 text-sm py-4 text-center">No hay cuentas de residente configuradas.</p>
              ) : (
                readers.map((reader) => (
                  <div key={reader.username} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
                        {reader.role === 'coordinador' ? 'C' : 'R'}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 text-sm">{reader.username}</span>
                          <span className={clsx(
                            "text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border tracking-wider select-none",
                            reader.role === 'coordinador' 
                              ? "bg-purple-50 text-purple-700 border-purple-200" 
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          )}>
                            {reader.role === 'coordinador' ? 'Coordinador' : 'Residente'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-550">Contraseña: {reader.password}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if(window.confirm(`¿Quitar permisos de residente a ${reader.username}?`)) {
                          removeReader(reader.username);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 rounded-md cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'admins' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Administradores del Sistema</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestiona los correos con privilegios de administrador que pueden editar la pizarra.
            </p>
          </div>
          
          <div className="p-6">
            <div className="flex gap-4 mb-6">
              <input 
                type="email" 
                value={newAdminEmail} 
                onChange={e => setNewAdminEmail(e.target.value)} 
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm" 
                placeholder="nuevo.admin@hospital.com" 
              />
              <button 
                onClick={() => {
                  if (newAdminEmail.trim() && !adminEmails.includes(newAdminEmail.trim())) {
                    addAdmin(newAdminEmail.trim());
                    setNewAdminEmail('');
                  }
                }}
                disabled={!newAdminEmail.trim()}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 cursor-pointer select-none"
              >
                <Plus className="w-4 h-4" />
                Añadir Admin
              </button>
            </div>

            <div className="space-y-3">
              {adminEmails.map((adminEmail: string) => (
                <div key={adminEmail} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="font-medium text-slate-800 text-sm">{adminEmail}</span>
                  {adminEmails.length > 1 && (
                    <button 
                      onClick={() => {
                        if(window.confirm(`¿Quitar permisos de administrador a ${adminEmail}?`)) {
                          removeAdmin(adminEmail);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 rounded-md cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Notificaciones de Telegram</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configura un Bot de Telegram para recibir alertas en tiempo real cuando un residente o coordinador envíe una solicitud de vacaciones.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Activation Toggle */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h4 className="font-semibold text-slate-700 text-sm">Activar Notificaciones</h4>
                <p className="text-xs text-slate-500">Habilita o deshabilita los avisos de Telegram al instante.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notifEnabled}
                  onChange={(e) => setNotifEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Inputs grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Telegram Bot Token
                </label>
                <input
                  type="text"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  placeholder="Ej. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Chat ID del Destinatario
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  placeholder="Ej. 987654321"
                />
              </div>
            </div>

            {/* Test result message */}
            {testResult && (
              <div
                className={clsx(
                  "p-4 rounded-xl text-xs font-medium border",
                  testResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                )}
              >
                {testResult.message}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={handleSaveNotifications}
                disabled={isSavingNotif}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {isSavingNotif ? 'Guardando...' : 'Guardar Configuración'}
              </button>

              <button
                onClick={handleTestNotification}
                disabled={isTestingNotif || !telegramBotToken || !telegramChatId}
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {isTestingNotif ? 'Enviando...' : 'Enviar Mensaje de Prueba'}
              </button>
            </div>

            {/* Helper Instructions card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mt-6 space-y-3">
              <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-500" />
                ¿Cómo configurar tu Bot de Telegram?
              </h4>
              <ol className="list-decimal list-inside text-xs text-slate-655 space-y-2 leading-relaxed">
                <li>
                  Busca al bot oficial <strong className="text-slate-800">@BotFather</strong> en Telegram y envíale el comando <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">/newbot</code>.
                </li>
                <li>
                  Sigue los pasos para darle nombre y usuario a tu bot. Al finalizar, @BotFather te proporcionará un <strong className="text-slate-800">Token API</strong> (un texto largo con letras y números). Cópialo en el campo de arriba.
                </li>
                <li>
                  Busca tu nuevo bot en Telegram por su nombre de usuario e inicia una conversación pulsando el botón <strong className="text-slate-800">Iniciar</strong> o enviando cualquier mensaje.
                </li>
                <li>
                  Para obtener tu <strong className="text-slate-800">Chat ID</strong> personal, busca el bot <strong className="text-slate-800">@userinfobot</strong> en Telegram y envíale un mensaje. Te responderá con tu ID numérico. Cópialo en el campo de arriba.
                </li>
                <li>
                  Haz clic en <strong className="text-slate-800">"Enviar Mensaje de Prueba"</strong> para comprobar que lo recibes en tu móvil, y no olvides pulsar <strong className="text-slate-800">"Guardar Configuración"</strong> al finalizar.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

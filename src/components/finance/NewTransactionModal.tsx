import { useState, useEffect, useMemo } from 'react';
import { X, Save, DollarSign, FileText, ArrowDownRight, ArrowUpRight, Plus, Trash2, UserPlus, Wallet, Calculator, Building2, Hash, CreditCard, Package, History } from 'lucide-react';
import { useAudit } from '../../context/AuditContext';
import HistoryModal from '../common/HistoryModal';
import { useFinance } from '../../context/FinanceContext';
import { useTreasury } from '../../context/TreasuryContext';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/UserContext';
import type { Transaction, TransactionType, Currency, InvoiceItem, TaxDetail } from '../../types/finance';
import { db } from '../../firebase';
import { collection, doc } from 'firebase/firestore';
import NewEntityModal from './NewEntityModal';

interface Props {
    onClose: () => void;
    editingTransactionId?: string;
}

const ARGENTINE_BANKS = [
    "Banco de la Nación Argentina",
    "Banco de la Provincia de Buenos Aires",
    "Banco Galicia",
    "Banco Santander Argentina",
    "Banco Macro",
    "BBVA Argentina",
    "Banco Hipotecario",
    "Banco Ciudad de Buenos Aires",
    "Banco Patagonia",
    "Banco Supervielle",
    "ICBC Argentina",
    "Banco Comafi",
    "Banco Credicoop",
    "Banco Itaú Argentina",
    "HSBC Argentina",
    "Banco de Córdoba (Bancor)",
    "Nuevo Banco de Santa Fe",
    "Nuevo Banco de Entre Ríos",
    "Banco de Corrientes",
    "Banco de Formosa",
    "Banco de San Juan",
    "Banco de Santa Cruz",
    "Banco de Tierra del Fuego",
    "Banco de La Pampa",
    "Banco del Chubut",
    "Banco de Neuquén (BPN)",
    "Brubank",
    "Ualá (Wilobank)",
    "Reba",
    "Banco del Sol",
    "Openbank Argentina"
];

export default function NewTransactionModal({ onClose, editingTransactionId }: Props) {

    const { entities, setTransactions, transactions, getNextDocumentNumber, updateTransaction, deleteTransaction, getTransactionBalance } = useFinance();
    const { accounts, cheques, addMovement, addCheque, updateChequeStatus } = useTreasury();
    const { products, addInventoryContainers, updateStockScale } = useInventory();
    const { logAction } = useAudit();
    const { currentUser } = useAuth();

    const [type, setType] = useState<TransactionType>('invoice_out');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [entityId, setEntityId] = useState('');
    const [isCreatingEntity, setIsCreatingEntity] = useState(false);
    const [newEntitySubtype, setNewEntitySubtype] = useState<'partner_employee' | 'third_party' | undefined>(undefined);

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [currency, setCurrency] = useState<Currency>('ARS');
    const [documentNumber, setDocumentNumber] = useState('');
    const [description, setDescription] = useState('');
    const [paidByThirdPartyId, setPaidByThirdPartyId] = useState<string>('');

    // AFIP invoice number fields (for invoices only)
    const [invoiceType, setInvoiceType] = useState<string>('FC-A');
    const [puntoVenta, setPuntoVenta] = useState<string>('');
    const [nroFactura, setNroFactura] = useState<string>('');

    // Auto-build documentNumber from AFIP fields when it’s an invoice
    const buildInvoiceDocNumber = (tipo: string, pv: string, nro: string) => {
        const pvPad = pv ? String(pv).padStart(4, '0') : '0000';
        const nroPad = nro ? String(nro).padStart(8, '0') : '00000000';
        return `${tipo} ${pvPad}-${nroPad}`;
    };

    // Document subtype (Factura, N. Débito, N. Crédito) and linked transaction
    const [documentSubtype, setDocumentSubtype] = useState<'factura' | 'nota_debito' | 'nota_credito'>('factura');
    const [linkedTransactionId, setLinkedTransactionId] = useState<string>('');
    // For payments: which pending invoices to settle
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

    // Multiple Payment Methods
    const [paymentLines, setPaymentLines] = useState<any[]>([]);

    // Invoice Arrays
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [taxes, setTaxes] = useState<TaxDetail[]>([]);

    // Exchange rates fetched from BNA via Ambito
    const [fetchedRates, setFetchedRates] = useState<{ divisa: number; billete: number }>({ divisa: 0, billete: 0 });
    const [exchangeRate, setExchangeRate] = useState<string>('');
    // TC provisional para pago a cuenta (se guarda en la TX para usarlo al vincular después)
    const [provisionalTC, setProvisionalTC] = useState<string>('');
    const [shouldAddToInventory, setShouldAddToInventory] = useState(false);

    const isClientContext = type === 'invoice_out' || type === 'payment_in';
    const isInvoice = type.includes('invoice');

    // Calculations
    const totalPaymentAmount = useMemo(() => paymentLines.reduce((acc, line) => acc + (parseFloat(line.amount) || 0), 0), [paymentLines]);


    useEffect(() => {
        const fetchRates = async () => {
            try {
                const [divisaRes, billeteRes] = await Promise.all([
                    fetch('https://mercados.ambito.com/dolar/divisas/variacion'),
                    fetch('https://mercados.ambito.com/dolar/oficial/variacion')
                ]);
                const divisaData = await divisaRes.json();
                const billeteData = await billeteRes.json();
                const parseAR = (v: string) => parseFloat(String(v).replace(',', '.')) || 0;
                setFetchedRates({
                    divisa: parseAR(divisaData.venta),
                    billete: parseAR(billeteData.venta)
                });
            } catch (error) {
                console.error("Error fetching BNA rates", error);
            }
        };
        fetchRates();
    }, []);

    useEffect(() => {
        if (!editingTransactionId && !isInvoice && paymentLines.length === 0) {
            handleAddPaymentLine();
        }
    }, [isInvoice, editingTransactionId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setPaymentLines([]);
        setProvisionalTC('');
    }, [entityId, type, currency]);

    // Auto-generate correlative document number for payments & collections
    useEffect(() => {
        if (editingTransactionId) return; // don't override when editing
        if (type === 'payment_in' || type === 'payment_out') {
            setDocumentNumber(getNextDocumentNumber(type));
        } else {
            setDocumentNumber('');
        }
    }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

    // Pre-load fields when editing an existing transaction
    useEffect(() => {
        if (!editingTransactionId) return;
        const tx = transactions.find(t => t.id === editingTransactionId);
        if (!tx) return;
        setType(tx.type);
        setEntityId(tx.entityId);
        setDate(tx.date);
        setCurrency(tx.currency);
        setDocumentNumber(tx.documentNumber);
        setDescription(tx.description);
        setPaidByThirdPartyId(tx.paidByThirdPartyId || '');
        setPaymentLines(tx.paymentBreakdown ? tx.paymentBreakdown.map((pb, idx) => ({
            id: `line-${idx}`,
            accountId: pb.accountId,
            amount: pb.amount,
            type: pb.method,
            chequeId: pb.chequeId,
            chequeNumber: pb.chequeNumber,
            chequeBank: pb.chequeBank,
            chequeIssueDate: pb.chequeIssueDate,
            chequeDueDate: pb.chequeDueDate,
            chequeHolder: pb.chequeHolder,
            isECheq: pb.isECheq
        })) : [{ id: 'line-0', amount: tx.amount, accountId: '', type: 'cash' }]);
        setExchangeRate(tx.exchangeRate ? String(tx.exchangeRate) : '');
        setDocumentSubtype(tx.documentSubtype || 'factura');
        setLinkedTransactionId((tx.relatedTransactionIds?.[0]) || '');
        if (tx.items) setItems(tx.items);
        if (tx.taxes) setTaxes(tx.taxes);
        // Parse AFIP document number format e.g. "FC-A 0001-00000123"
        const match = tx.documentNumber.match(/^([A-Z]{2}-[A-Z])\s(\d+)-(\d+)$/);
        if (match) {
            setInvoiceType(match[1]);
            setPuntoVenta(String(parseInt(match[2], 10)));
            setNroFactura(String(parseInt(match[3], 10)));
        }
    }, [editingTransactionId]); // eslint-disable-line react-hooks/exhaustive-deps



    // Pending invoices for the selected entity (for payment flow)
    const pendingInvoices = useMemo(() => {
        if (!entityId || isInvoice) return [];
        const invoiceType: TransactionType = type === 'payment_out' ? 'invoice_in' : 'invoice_out';
        // We now fetch ALL pending invoices regardless of currency to allow cross-currency settlement
        return transactions.filter(t =>
            t.entityId === entityId &&
            t.type === invoiceType &&
            (t.status === 'pending' || t.status === 'partial')
        );
    }, [entityId, type, transactions, isInvoice]);

    // These must be AFTER pendingInvoices (they depend on it)
    const hasCrossCurrencyInvoices = selectedInvoiceIds.some(id => {
        const inv = pendingInvoices.find(i => i.id === id);
        return inv && inv.currency !== currency;
    });
    // Is this a pago a cuenta (no invoices selected for a payment)
    const isPagoACuenta = (type === 'payment_in' || type === 'payment_out') && selectedInvoiceIds.length === 0;
    // Show TC provisional field for ARS pago a cuenta payments
    const showProvisionalTC = isPagoACuenta && currency === 'ARS';

    // Auto-sum amounts when invoices are selected (logic for same-currency or with exchange rates)
    useEffect(() => {
        if (selectedInvoiceIds.length > 0) {
            let totalInPaymentCurrency = 0;
            const rate = parseFloat(exchangeRate) || fetchedRates.divisa || 1;

            selectedInvoiceIds.forEach(id => {
                const inv = pendingInvoices.find(i => i.id === id);
                if (inv) {
                    const isNC = inv.documentSubtype === 'nota_credito' || (inv.documentNumber || '').toUpperCase().startsWith('NC');
                    const multiplier = isNC ? -1 : 1;

                    if (inv.currency === currency) {
                        totalInPaymentCurrency += inv.amount * multiplier;
                    } else {
                        // For cross-currency, we need to convert the invoice amount to the payment currency
                        let convertedAmount = 0;
                        if (currency === 'ARS' && inv.currency.startsWith('USD')) {
                            // Paying USD invoice with ARS: Invoice USD * rate = ARS Amount
                            convertedAmount = inv.amount * rate;
                        } else if (currency.startsWith('USD') && inv.currency === 'ARS') {
                            // Paying ARS invoice with USD: Invoice ARS / rate = USD Amount
                            convertedAmount = inv.amount / rate;
                        } else {
                            // USD Divisa to USD Billete or vice versa (usually 1:1 or specific rate)
                            convertedAmount = inv.amount;
                        }
                        totalInPaymentCurrency += convertedAmount * multiplier;
                    }
                }
            });
            // Update the first payment line if it exists to match the invoice total
            setPaymentLines(prev => {
                if (prev.length === 0) return prev;
                const newLines = [...prev];
                // Ensure we don't set a negative payment (limit to 0 or more)
                newLines[0] = { ...newLines[0], amount: Math.max(0, totalInPaymentCurrency).toFixed(2) };
                return newLines;
            });
        }
    }, [selectedInvoiceIds, pendingInvoices, currency, exchangeRate, fetchedRates]);

    // Effect to auto-fill exchange rate when currency or selections change
    useEffect(() => {
        if (currency === 'USD_DIVISA' && fetchedRates.divisa > 0) {
            setExchangeRate(fetchedRates.divisa.toString());
        } else if (currency === 'USD_BILLETE' && fetchedRates.billete > 0) {
            setExchangeRate(fetchedRates.billete.toString());
        } else if (currency === 'ARS') {
            // If ARS payment has cross-currency invoices selected, auto-fill divisa rate
            const hasUSDInvoices = selectedInvoiceIds.some(id => {
                const inv = pendingInvoices.find(i => i.id === id);
                return inv && inv.currency !== 'ARS';
            });
            if (hasUSDInvoices && fetchedRates.divisa > 0 && !exchangeRate) {
                setExchangeRate(fetchedRates.divisa.toString());
            } else if (!hasUSDInvoices) {
                setExchangeRate('');
            }
        }
    }, [currency, fetchedRates, selectedInvoiceIds]); // eslint-disable-line react-hooks/exhaustive-deps



    // Auto-fill provisional TC when account type changes
    // (Simplified for multiple lines: we use the first line if it's a cheque/usd)
    useEffect(() => {
        if (!showProvisionalTC || paymentLines.length === 0) return;
        const mainLine = paymentLines[0];
        const selectedAccount = accounts.find(a => a.id === mainLine.accountId);
        if (selectedAccount?.type === 'cheque' || selectedAccount?.currency === 'USD_DIVISA') {
            if (fetchedRates.divisa > 0) setProvisionalTC(fetchedRates.divisa.toString());
        } else if (selectedAccount?.currency === 'USD_BILLETE') {
            if (fetchedRates.billete > 0) setProvisionalTC(fetchedRates.billete.toString());
        } else if (fetchedRates.divisa > 0 && !provisionalTC) {
            setProvisionalTC(fetchedRates.divisa.toString());
        }
    }, [paymentLines, fetchedRates, showProvisionalTC]); // eslint-disable-line react-hooks/exhaustive-deps


    // Calculations
    const currentSubtotal = useMemo(() => items.reduce((acc, item) => acc + item.subtotal, 0), [items]);
    const currentIvaTotal = useMemo(() => items.reduce((acc, item) => acc + item.ivaAmount, 0), [items]);
    const currentTaxesTotal = useMemo(() => taxes.reduce((acc, tax) => acc + tax.amount, 0), [taxes]);

    // Total Amount: if payment, sum of lines. If invoice: subtotal + items iva + other taxes
    const totalAmount = isInvoice
        ? currentSubtotal + currentIvaTotal + currentTaxesTotal
        : totalPaymentAmount;

    const handleAddItem = () => {
        setItems(prev => [...prev, {
            id: doc(collection(db, 'invoice_items')).id,
            description: '',
            quantity: 0,
            unitPrice: 0,
            ivaPercentage: 21,
            ivaAmount: 0,
            subtotal: 0
        }]);
    };

    const handleAddPaymentLine = () => {
        setPaymentLines(prev => [...prev, {
            id: doc(collection(db, 'payment_lines')).id,
            accountId: '',
            amount: 0,
            type: 'cash',
            chequeNumber: '',
            chequeBank: '',
            chequeIssueDate: new Date().toISOString().split('T')[0],
            chequeDueDate: '',
            chequeHolder: '',
            isECheq: false,
            chequeId: ''
        }]);
    };

    const handleRemovePaymentLine = (id: string) => {
        setPaymentLines(prev => prev.filter(l => l.id !== id));
    };

    const handleUpdatePaymentLine = (id: string, field: string, value: any) => {
        setPaymentLines(prev => prev.map(line => {
            if (line.id !== id) return line;
            const updated = { ...line, [field]: value };

            // Auto-fill from Cheque Portfolio when selecting a chequeId (Endorsing)
            if (field === 'chequeId' && value) {
                const selectedCheque = cheques.find(c => c.id === value);
                if (selectedCheque) {
                    updated.amount = selectedCheque.amount;
                    updated.chequeNumber = selectedCheque.number;
                    updated.chequeBank = selectedCheque.bankInfo;
                    updated.chequeHolder = selectedCheque.holder || '';
                    updated.chequeIssueDate = selectedCheque.issueDate;
                    updated.chequeDueDate = selectedCheque.paymentDate;
                    updated.isECheq = selectedCheque.isECheq;
                }
            }

            // Auto-detect type from account
            if (field === 'accountId') {
                const acc = accounts.find(a => a.id === value);
                if (acc?.type === 'cheque') updated.type = 'cheque_third';
                else if (acc?.type === 'bank') {
                    // If it was previously a third-party cheque but now we select a bank, 
                    // maybe keep it as bank transfer unless user explicitly chose Own Cheque
                    if (updated.type !== 'cheque_own') updated.type = 'bank';
                }
                else updated.type = 'cash';
            }

            return updated;
        }));
    };

    const handleUpdateItem = (id: string, field: keyof InvoiceItem | 'productId', value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;

            if (field === 'productId') {
                const product = products.find(p => p.id === value);
                return {
                    ...item,
                    inventoryItemId: value,
                    description: product ? product.name : item.description
                };
            }

            const numValue = (field === 'quantity' || field === 'unitPrice' || field === 'ivaPercentage') ? parseFloat(value) || 0 : value;
            const updated = { ...item, [field]: numValue };

            // Auto recalculate
            if (field === 'quantity' || field === 'unitPrice' || field === 'ivaPercentage') {
                updated.subtotal = Number((updated.quantity * updated.unitPrice).toFixed(2));
                updated.ivaAmount = Number((updated.subtotal * (updated.ivaPercentage / 100)).toFixed(2));
            }
            return updated;
        }));
    };

    const handleRemoveItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

    const handleAddTax = () => {
        setTaxes(prev => [...prev, {
            id: doc(collection(db, 'tax_details')).id,
            name: '',
            type: 'perception_iibb',
            amount: 0
        }]);
    };

    const handleUpdateTax = (id: string, field: keyof TaxDetail, value: any) => {
        setTaxes(prev => prev.map(tax => {
            if (tax.id !== id) return tax;
            const val = field === 'amount' ? parseFloat(value) || 0 : value;
            return { ...tax, [field]: val };
        }));
    };

    const handleRemoveTax = (id: string) => setTaxes(prev => prev.filter(t => t.id !== id));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!entityId || totalAmount <= 0) {
            alert("Completa los campos obligatorios y asegúrate de que el monto sea mayor a 0.");
            return;
        }

        if (!isInvoice && paymentLines.length === 0) {
            alert("Agrega al menos una forma de pago/cobro.");
            return;
        }
        if (!isInvoice && paymentLines.some(line => !line.accountId || !line.amount || parseFloat(line.amount) <= 0)) {
            alert("Asegúrate de que todas las formas de pago/cobro tengan una cuenta y un monto válido.");
            return;
        }
        if (!isInvoice && paymentLines.some(line => accounts.find(a => a.id === line.accountId)?.type === 'cheque' && !line.chequeNumber)) {
            alert("Completa los detalles del cheque para todas las líneas de pago con cheque.");
            return;
        }


        const finalId = editingTransactionId || doc(collection(db, 'transactions')).id;
        const rate = parseFloat(exchangeRate) || (currency === 'ARS' ? fetchedRates.divisa : (currency === 'USD_DIVISA' ? fetchedRates.divisa : fetchedRates.billete)) || 1;

        const settlements: any[] = [];

        // Separate NCs from Invoices
        const selectedNCs = pendingInvoices.filter(i =>
            selectedInvoiceIds.includes(i.id) &&
            (i.documentSubtype === 'nota_credito' || (i.documentNumber || '').toUpperCase().startsWith('NC'))
        );
        const selectedInvoicesOnly = pendingInvoices.filter(i =>
            selectedInvoiceIds.includes(i.id) &&
            !(i.documentSubtype === 'nota_credito' || (i.documentNumber || '').toUpperCase().startsWith('NC'))
        );

        // 1. Process NCs: they provide additional "funds" for the settlement
        let totalValueFromNCs = 0;
        selectedNCs.forEach(nc => {
            // Calculate how much this NC is worth in the current payment currency
            let valueInPaymentCurrency = nc.amount;
            if (nc.currency !== currency) {
                if (currency === 'ARS' && nc.currency.startsWith('USD')) valueInPaymentCurrency = nc.amount * rate;
                else if (currency.startsWith('USD') && nc.currency === 'ARS') valueInPaymentCurrency = nc.amount / rate;
            }
            totalValueFromNCs += valueInPaymentCurrency;

            // Mark the NC as "settled" (used up)
            settlements.push({
                invoiceId: nc.id,
                amountApplied: nc.amount,
                exchangeRateApplied: rate
            });
        });

        // 2. Distribute total available (Payment Amount + NC Values) to Invoices
        let remainingToApply = totalAmount + totalValueFromNCs;

        selectedInvoicesOnly.forEach(inv => {
            if (remainingToApply <= 0.001) return;

            // Calculate ACTUAL pending amount for this invoice
            const currentAppliedToInv = transactions
                .filter(t => t.id !== finalId && (t.type === 'payment_in' || t.type === 'payment_out'))
                .reduce((acc, t) => {
                    const s = t.settlements?.find(s => s.invoiceId === inv.id);
                    return acc + (s?.amountApplied || 0);
                }, 0);

            const pendingInInvCurrency = inv.amount - currentAppliedToInv;
            if (pendingInInvCurrency <= 0.001) return;

            let amountInNativeOfPayment;
            let amountAppliedToInvoice;

            if (inv.currency === currency) {
                amountInNativeOfPayment = Math.min(pendingInInvCurrency, remainingToApply);
                amountAppliedToInvoice = amountInNativeOfPayment;
            } else {
                // Cross currency logic
                let invDebtInPaymentCurrency;
                if (currency === 'ARS' && inv.currency.startsWith('USD')) {
                    invDebtInPaymentCurrency = pendingInInvCurrency * rate;
                } else if (currency.startsWith('USD') && inv.currency === 'ARS') {
                    invDebtInPaymentCurrency = pendingInInvCurrency / rate;
                } else {
                    invDebtInPaymentCurrency = pendingInInvCurrency;
                }

                amountInNativeOfPayment = Math.min(invDebtInPaymentCurrency, remainingToApply);

                if (currency === 'ARS' && inv.currency.startsWith('USD')) {
                    amountAppliedToInvoice = amountInNativeOfPayment / rate;
                } else if (currency.startsWith('USD') && inv.currency === 'ARS') {
                    amountAppliedToInvoice = amountInNativeOfPayment * rate;
                } else {
                    amountAppliedToInvoice = amountInNativeOfPayment;
                }
            }

            remainingToApply -= amountInNativeOfPayment;
            settlements.push({
                invoiceId: inv.id,
                amountApplied: amountAppliedToInvoice,
                exchangeRateApplied: rate
            });
        });

        const calculatedAmountARS = currency === 'ARS' ? totalAmount : (totalAmount * rate);

        const newTx: Transaction = {
            id: finalId,
            entityId,
            date,
            type,
            currency,
            documentSubtype,
            amount: totalAmount,
            amountARS: calculatedAmountARS,
            exchangeRate: rate,
            documentNumber,
            description,
            status: isInvoice ? 'pending' : 'completed',
            items: isInvoice ? items : undefined,
            taxes: isInvoice ? taxes : undefined,
            paymentBreakdown: (!isInvoice && paymentLines.length > 0) ? paymentLines.map(l => ({
                accountId: l.accountId,
                amount: parseFloat(l.amount) || 0,
                method: l.type,
                chequeId: l.chequeId,
                chequeNumber: l.chequeNumber,
                chequeBank: l.chequeBank,
                chequeIssueDate: l.chequeIssueDate,
                chequeDueDate: l.chequeDueDate,
                chequeHolder: l.chequeHolder,
                isECheq: l.isECheq
            })) : undefined,
            relatedTransactionIds: selectedInvoiceIds.length > 0 ? selectedInvoiceIds : (linkedTransactionId ? [linkedTransactionId] : undefined)
        };

        if (editingTransactionId) {
            updateTransaction(editingTransactionId, newTx);
        } else {
            setTransactions(prev => [newTx, ...prev]);
        }

        // Apply applications if any invoices were selected
        if (selectedInvoiceIds.length > 0) {
            selectedInvoiceIds.forEach(invId => {
                // Determine how much to apply to this invoice
                // This is a simplified auto-application for the modal context
                const inv = transactions.find(t => t.id === invId);
                if (inv) {
                    // For simplicity in the modal, we apply the full available amount up to the invoice amount
                    // A more complex loop might be needed for partials, but the context handle it now
                }
            });
        }

        if (type === 'invoice_in' && items.length > 0 && shouldAddToInventory) {
            const stockableItems = items.filter(i => i.inventoryItemId);
            if (stockableItems.length > 0) {
                const newContainers = stockableItems.map((item) => {
                    const product = products.find(p => p.id === item.inventoryItemId);
                    return {
                        id: doc(collection(db, 'inventory')).id,
                        itemId: item.inventoryItemId!,
                        batchNumber: 'COMPRA-' + date.split('-').join(''),
                        containerType: 'Otro' as const,
                        unit: product?.unit || 'L' as const,
                        totalCapacity: item.quantity,
                        currentAmount: item.quantity,
                        status: 'Nuevo' as const
                    };
                });
                addInventoryContainers(newContainers);

                // Also update catalog global stock levels
                stockableItems.forEach(item => {
                    updateStockScale(item.inventoryItemId!, item.quantity);
                });
            }
        }

        // Add treasury movements and handle cheques for EACH payment line
        if (!isInvoice && paymentLines.length > 0) {
            paymentLines.forEach(line => {
                const lineAmount = parseFloat(line.amount) || 0;
                if (lineAmount <= 0) return;

                const movementId = doc(collection(db, 'movements')).id;
                addMovement({
                    id: movementId,
                    accountId: line.accountId,
                    date,
                    amount: type === 'payment_in' ? lineAmount : -lineAmount,
                    type: type === 'payment_in' ? 'payment_received' : 'payment_sent',
                    relatedTransactionId: newTx.id,
                    description: `Ref: ${documentNumber} - ${description || (type === 'payment_in' ? 'Cobranza' : 'Pago')} (${line.type})`,
                });

                // Handle Cheque Logic per line
                if (line.type === 'cheque_third') {
                    if (type === 'payment_in') {
                        // Received a new cheque
                        addCheque({
                            id: doc(collection(db, 'cheques')).id,
                            number: line.chequeNumber,
                            bankInfo: line.chequeBank,
                            type: 'third_party',
                            isECheq: line.isECheq,
                            issueDate: line.chequeIssueDate || date,
                            paymentDate: line.chequeDueDate || date,
                            amount: lineAmount,
                            status: 'en_cartera',
                            receivedFromId: entityId,
                            holder: line.chequeHolder
                        });
                    } else if (type === 'payment_out' && line.chequeId) {
                        // Endorsed an existing third party cheque
                        updateChequeStatus(line.chequeId, 'entregado', entityId);
                    }
                } else if (line.type === 'cheque_own' && type === 'payment_out') {
                    // Issued a new own cheque
                    addCheque({
                        id: doc(collection(db, 'cheques')).id,
                        number: line.chequeNumber,
                        bankInfo: accounts.find(a => a.id === line.accountId)?.name || 'Cuenta Bancaria',
                        type: 'own',
                        isECheq: line.isECheq,
                        issueDate: line.chequeIssueDate || date,
                        paymentDate: line.chequeDueDate || date,
                        amount: lineAmount,
                        status: 'entregado',
                        givenToId: entityId,
                        bankAccountId: line.accountId
                    });
                }
            });
        }


        logAction({
            userId: currentUser.id,
            userName: currentUser.name,
            action: editingTransactionId ? 'update' : 'create',
            module: 'finanzas',
            entityId: finalId,
            entityName: documentNumber || 'Comprobante',
            details: `${editingTransactionId ? 'Se actualizó' : 'Se creó'} un comprobante de tipo ${type} por ${currency} ${totalAmount}`
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <DollarSign className="w-5 h-5 mr-2 text-emerald-500" />
                        Nueva Transacción
                    </h2>
                    <div className="flex items-center gap-2">
                        {editingTransactionId && (
                            <button 
                                type="button"
                                onClick={() => setIsHistoryOpen(true)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                                title="Ver historial"
                            >
                                <History className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto w-full flex-grow">
                    <form id="new-tx-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Transaction Type Buttons */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <button type="button" onClick={() => setType('invoice_out')} className={`flex flex-col items-center justify-center p-2 rounded-md text-sm font-medium transition-colors ${type === 'invoice_out' ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                <FileText className="w-4 h-4 mb-1" />
                                Venta (Factura)
                            </button>
                            <button type="button" onClick={() => setType('payment_in')} className={`flex flex-col items-center justify-center p-2 rounded-md text-sm font-medium transition-colors ${type === 'payment_in' ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                <ArrowDownRight className="w-4 h-4 mb-1" />
                                Cobranza
                            </button>
                            <button type="button" onClick={() => setType('invoice_in')} className={`flex flex-col items-center justify-center p-2 rounded-md text-sm font-medium transition-colors ${type === 'invoice_in' ? 'bg-white dark:bg-slate-800 shadow-sm text-rose-600 dark:text-rose-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                <FileText className="w-4 h-4 mb-1" />
                                Compra (Factura)
                            </button>
                            <button type="button" onClick={() => setType('payment_out')} className={`flex flex-col items-center justify-center p-2 rounded-md text-sm font-medium transition-colors ${type === 'payment_out' ? 'bg-white dark:bg-slate-800 shadow-sm text-rose-600 dark:text-rose-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                <ArrowUpRight className="w-4 h-4 mb-1" />
                                Pago
                            </button>
                        </div>

                        {/* Document Subtype selector (only for invoices) */}
                        {isInvoice && (
                            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                {(['factura', 'nota_debito', 'nota_credito'] as const).map(sub => (
                                    <button
                                        key={sub}
                                        type="button"
                                        onClick={() => { setDocumentSubtype(sub); setLinkedTransactionId(''); }}
                                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${documentSubtype === sub
                                            ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-slate-100'
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                            }`}
                                    >
                                        {sub === 'factura' ? 'Factura' : sub === 'nota_debito' ? 'N. Débito' : 'N. Crédito'}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Vinculación a transacción previa (para N. Débito / N. Crédito) */}
                        {isInvoice && documentSubtype !== 'factura' && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4">
                                <label className="block text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">
                                    Vinculada a comprobante anterior (Opcional)
                                </label>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                                    Seleccioná la factura o pago al que corresponde esta nota. Impactará en cta. cte. y quedará enlazada.
                                </p>
                                <select
                                    value={linkedTransactionId}
                                    onChange={e => setLinkedTransactionId(e.target.value)}
                                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100 text-sm"
                                >
                                    <option value="">-- Sin vincular --</option>
                                    {transactions
                                        .filter(t => t.entityId === entityId && t.currency === currency)
                                        .sort((a, b) => b.date.localeCompare(a.date))
                                        .map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.date} | {t.documentNumber} | {t.type === 'invoice_in' ? 'Compra' : t.type === 'invoice_out' ? 'Venta' : t.type === 'payment_out' ? 'Pago' : 'Cobranza'} | ${t.amount.toLocaleString()}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                        )}

                        {/* Banner Pago a Cuenta si no hay imputaciones seleccionadas */}
                        {!isInvoice && entityId && selectedInvoiceIds.length === 0 && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/50 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0 font-black text-sm">$</div>
                                <div>
                                    <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Pago a Cuenta (sin imputar)</p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400">Este pago quedará sin vincular a ninguna factura. Podés imputarlo después desde la Cuenta Corriente del {isClientContext ? 'cliente' : 'proveedor'}.</p>
                                </div>
                            </div>
                        )}

                        {/* Panel de comprobantes pendientes (solo para pagos con entidad seleccionada) */}
                        {!isInvoice && entityId && pendingInvoices.length > 0 && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4">
                                <label className="block text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">
                                    Comprobantes Pendientes a Saldar
                                </label>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                                    Seleccioná cuáles facturas saldás con este pago. El monto se calculará automáticamente. Podés dejarlo sin seleccionar para hacer un <strong>pago a cuenta</strong>.
                                </p>
                                <div className="space-y-2">
                                    {pendingInvoices.map(inv => {
                                        const pendingAmount = getTransactionBalance(inv.id);
                                        if (pendingAmount < 0.01) return null;

                                        const isNC = inv.documentSubtype === 'nota_credito' || (inv.documentNumber || '').toUpperCase().startsWith('NC');

                                        return (
                                            <label key={inv.id} className={`flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/30 transition-colors ${inv.currency !== currency ? 'border-amber-200 shadow-sm shadow-amber-100/50 dark:shadow-none' : 'border-blue-100'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedInvoiceIds.includes(inv.id)}
                                                    onChange={e => {
                                                        setSelectedInvoiceIds(prev =>
                                                            e.target.checked ? [...prev, inv.id] : prev.filter(id => id !== inv.id)
                                                        );
                                                    }}
                                                    className="w-4 h-4 rounded accent-blue-600"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{inv.documentNumber}</span>
                                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${inv.currency === 'ARS' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                            inv.currency === 'USD_DIVISA' ? 'bg-blue-100 text-blue-600 border-blue-200' :
                                                                'bg-emerald-100 text-emerald-600 border-emerald-200'
                                                            }`}>{inv.currency}</span>
                                                    </div>
                                                    <div className="flex items-center text-[11px] text-slate-500 space-x-2">
                                                        <span>{new Date(inv.date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                                        <span>•</span>
                                                        <span className={`font-bold uppercase ${inv.status === 'partial' || pendingAmount < inv.amount ? 'text-amber-500' : 'text-rose-500'}`}>
                                                            {inv.status === 'partial' || pendingAmount < inv.amount ? `Pendiente: ${inv.currency === 'ARS' ? '$' : 'U$D'} ${pendingAmount.toLocaleString()}` : 'Pendiente Total'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end">
                                                    <div className={`text-sm font-black ${isNC ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                                        {isNC ? '-' : ''} {inv.currency === 'ARS' ? '$' : 'U$D'} {inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </div>
                                                    {inv.currency !== currency && (
                                                        <div className="text-[10px] text-amber-600 font-bold italic mt-0.5">
                                                            ≈ {currency === 'ARS' ? '$' : 'U$D'} {isNC ? '-' : ''} {(pendingAmount * (currency === 'ARS' ? (parseFloat(exchangeRate) || fetchedRates.divisa) : (1 / (parseFloat(exchangeRate) || fetchedRates.divisa)))).toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
                                                        </div>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                                {selectedInvoiceIds.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800/50 flex justify-between items-center">
                                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{selectedInvoiceIds.length} comprobante(s) seleccionado(s)</span>
                                        <span className="text-base font-bold text-blue-800 dark:text-blue-200">
                                            Total a Saldar: {currency === 'ARS' ? '$' : 'U$D'} {
                                                pendingInvoices
                                                    .filter(i => selectedInvoiceIds.includes(i.id))
                                                    .reduce((acc, inv) => {
                                                        const isNC = inv.documentSubtype === 'nota_credito' || (inv.documentNumber || '').toUpperCase().startsWith('NC');
                                                        const multiplier = isNC ? -1 : 1;
                                                        const rateValue = parseFloat(exchangeRate) || fetchedRates.divisa || 1;

                                                        let amountInCurrentCurrency = inv.amount;
                                                        if (inv.currency !== currency) {
                                                            if (currency === 'ARS' && inv.currency.startsWith('USD')) amountInCurrentCurrency = inv.amount * rateValue;
                                                            else if (currency.startsWith('USD') && inv.currency === 'ARS') amountInCurrentCurrency = inv.amount / rateValue;
                                                        }

                                                        return acc + (amountInCurrentCurrency * multiplier);
                                                    }, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })
                                            }
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* General Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    {isClientContext ? 'Cliente *' : 'Proveedor *'}
                                </label>
                                <div className="flex gap-2">
                                    <select value={entityId} onChange={e => setEntityId(e.target.value)} className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-950 dark:text-slate-100 appearance-none font-bold">
                                        <option value="" disabled>Seleccione una entidad...</option>
                                        {entities
                                            .filter(e => {
                                                if (isClientContext) return e.type === 'client' || e.type === 'both';
                                                return e.type === 'supplier' || e.type === 'both';
                                            })
                                            .map(e => (
                                                <option key={e.id} value={e.id}>{e.name}{e.subtype ? ` (${e.subtype === 'partner_employee' ? 'Socio/Emp.' : 'Tercero'})` : ''}</option>
                                            ))
                                        }
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingEntity(true)}
                                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center shrink-0"
                                        title={isClientContext ? 'Nuevo Cliente' : 'Nuevo Proveedor'}
                                    >
                                        <UserPlus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha *</label>
                                <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-950 dark:text-slate-100 font-bold" />
                            </div>

                            {/* Número de Comprobante: tipo AFIP + punto de venta + número */}
                            {isInvoice ? (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Comprobante *</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {/* Tipo AFIP */}
                                        <select
                                            value={invoiceType}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setInvoiceType(val);
                                                setDocumentNumber(buildInvoiceDocNumber(val, puntoVenta, nroFactura));
                                                // Definitive mapping
                                                if (val.startsWith('NC')) setDocumentSubtype('nota_credito');
                                                else if (val.startsWith('ND')) setDocumentSubtype('nota_debito');
                                                else setDocumentSubtype('factura');
                                            }}
                                            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-950 dark:text-slate-100 font-bold text-sm"
                                        >
                                            <optgroup label="Facturas">
                                                <option value="FC-A">FC-A (Factura A)</option>
                                                <option value="FC-B">FC-B (Factura B)</option>
                                                <option value="FC-C">FC-C (Factura C)</option>
                                                <option value="FC-E">FC-E (Factura E – Exportación)</option>
                                            </optgroup>
                                            <optgroup label="Notas de Débito">
                                                <option value="ND-A">ND-A (N. Débito A)</option>
                                                <option value="ND-B">ND-B (N. Débito B)</option>
                                                <option value="ND-C">ND-C (N. Débito C)</option>
                                            </optgroup>
                                            <optgroup label="Notas de Crédito">
                                                <option value="NC-A">NC-A (N. Crédito A)</option>
                                                <option value="NC-B">NC-B (N. Crédito B)</option>
                                                <option value="NC-C">NC-C (N. Crédito C)</option>
                                            </optgroup>
                                        </select>
                                        {/* Punto de Venta */}
                                        <div className="flex items-center gap-1">
                                            <span className="text-slate-400 font-bold text-sm">PV</span>
                                            <input
                                                type="number" min="1" max="9999"
                                                value={puntoVenta}
                                                onChange={e => setPuntoVenta(e.target.value)}
                                                onBlur={e => {
                                                    const v = e.target.value;
                                                    setPuntoVenta(v);
                                                    setDocumentNumber(buildInvoiceDocNumber(invoiceType, v, nroFactura));
                                                }}
                                                placeholder="0001"
                                                className="w-20 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-950 dark:text-slate-100 text-sm text-center font-bold"
                                            />
                                        </div>
                                        <span className="self-center text-slate-400 font-bold">-</span>
                                        {/* Número de Factura */}
                                        <input
                                            type="number" min="1"
                                            value={nroFactura}
                                            onChange={e => setNroFactura(e.target.value)}
                                            onBlur={e => {
                                                const v = e.target.value;
                                                setNroFactura(v);
                                                setDocumentNumber(buildInvoiceDocNumber(invoiceType, puntoVenta, v));
                                            }}
                                            placeholder="00000001"
                                            className="flex-1 min-w-[120px] px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-950 dark:text-slate-100 text-sm text-center font-black"
                                        />
                                    </div>
                                    {/* Preview del numero formateado */}
                                    {(puntoVenta || nroFactura) && (
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                                            ✓ {buildInvoiceDocNumber(invoiceType, puntoVenta, nroFactura)}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Número de Comprobante</label>
                                    <input
                                        type="text"
                                        value={documentNumber}
                                        readOnly
                                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-mono text-sm cursor-default"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">Generado automáticamente</p>
                                </div>
                            )}

                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 md:col-span-2 grid grid-cols-2 gap-4">
                                <div className={!isInvoice ? "col-span-1" : "col-span-2"}>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Moneda *</label>
                                    <select required value={currency} onChange={e => setCurrency(e.target.value as Currency)} className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-950 dark:text-slate-100 font-bold">
                                        <option value="ARS">Pesos (ARS)</option>
                                        <option value="USD_DIVISA">Dólar Divisa</option>
                                        <option value="USD_BILLETE">Dólar Billete</option>
                                    </select>
                                </div>
                                {/* Metodos de Pago Builder */}
                                {!isInvoice && (
                                    <div className="md:col-span-2 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mt-2">
                                        <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center gap-2">
                                                <Wallet className="w-5 h-5 text-emerald-600" />
                                                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-tight">Desglose de Pago / Cobro</h3>
                                            </div>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => {
                                                    const chequeAcc = accounts.find(a => a.type === 'cheque');
                                                    const newLine = {
                                                        id: `line-${Date.now()}-${Math.random()}`,
                                                        accountId: chequeAcc?.id || '',
                                                        amount: 0,
                                                        type: 'cheque_third' as const,
                                                        chequeNumber: '',
                                                        chequeBank: '',
                                                        chequeIssueDate: new Date().toISOString().split('T')[0],
                                                        chequeDueDate: '',
                                                        chequeHolder: '',
                                                        isECheq: false,
                                                        chequeId: ''
                                                    };
                                                    setPaymentLines(prev => [...prev, newLine]);
                                                }} className="text-[10px] flex items-center gap-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-3 py-1.5 rounded-lg font-black hover:bg-indigo-100 transition-colors border border-indigo-200 dark:border-indigo-800">
                                                    <CreditCard className="w-3 h-3" /> + Cheque
                                                </button>
                                                <button type="button" onClick={handleAddPaymentLine} className="text-[10px] flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-black hover:bg-emerald-700 transition-colors shadow-sm">
                                                    <Plus className="w-3 h-3" /> + Otro Medio
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                                            {paymentLines.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                                                        <Calculator className="w-6 h-6 opacity-30" />
                                                    </div>
                                                    <p className="text-xs font-bold uppercase tracking-widest opacity-60">Sin medios de pago</p>
                                                    <p className="text-[10px] mt-1">Haga clic en los botones de arriba para desglosar el pago</p>
                                                </div>
                                            ) : (
                                                paymentLines.map((line) => {
                                                    const selectedAccount = accounts.find(a => a.id === line.accountId);
                                                    const isCheque = line.type?.startsWith('cheque') || selectedAccount?.type === 'cheque';

                                                    // Filter accounts: if it's an OWN cheque, only show bank accounts (chequeras)
                                                    const filteredAccounts = line.type === 'cheque_own'
                                                        ? accounts.filter(a => a.type === 'bank')
                                                        : accounts;

                                                    return (
                                                        <div key={line.id} className="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all hover:ring-2 hover:ring-emerald-500/20">
                                                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                                            <div className="p-4 space-y-4">
                                                                <div className="flex items-end gap-3 flex-wrap md:flex-nowrap">
                                                                    <div className="flex-1 min-w-[200px]">
                                                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                                                                            <Building2 className="w-3 h-3" /> {line.type === 'cheque_own' ? 'Chequera (Banco Agrovista)' : 'Caja / Banco / Cartera'}
                                                                        </label>
                                                                        <select
                                                                            required
                                                                            value={line.accountId}
                                                                            onChange={e => handleUpdatePaymentLine(line.id, 'accountId', e.target.value)}
                                                                            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-emerald-500 transition-shadow"
                                                                        >
                                                                            <option value="">-- Seleccionar --</option>
                                                                            {filteredAccounts.map(acc => (
                                                                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <div className="w-full md:w-48">
                                                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                                                                            <Hash className="w-3 h-3" /> Importe ({currency})
                                                                        </label>
                                                                        <div className="relative">
                                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                                <span className="text-emerald-500 text-sm font-black">$</span>
                                                                            </div>
                                                                            <input
                                                                                required
                                                                                type="number"
                                                                                min="0.01"
                                                                                step="0.01"
                                                                                value={line.amount || ''}
                                                                                onChange={e => handleUpdatePaymentLine(line.id, 'amount', e.target.value)}
                                                                                className="w-full pl-7 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 font-extrabold focus:ring-2 focus:ring-emerald-500"
                                                                                placeholder="0.00"
                                                                                readOnly={line.type === 'cheque_third' && type === 'payment_out' && !!line.chequeId}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemovePaymentLine(line.id)}
                                                                            className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors border border-transparent hover:border-rose-100"
                                                                            title="Eliminar esta línea"
                                                                        >
                                                                            <Trash2 className="w-5 h-5" />
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Cheque Details Section */}
                                                                {isCheque && (
                                                                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800/40 space-y-4">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                                                                <CreditCard className="w-4 h-4" /> Datos del Cheque {line.type === 'cheque_third' ? '(Tercero)' : '(Propio)'}
                                                                            </h4>
                                                                            {type === 'payment_out' && (
                                                                                <div className="flex bg-white dark:bg-slate-950 p-1 rounded-lg border border-indigo-100 dark:border-indigo-900/40 shadow-sm">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleUpdatePaymentLine(line.id, 'type', 'cheque_third')}
                                                                                        className={`px-3 py-1 text-[9px] font-black rounded-md transition-all ${line.type === 'cheque_third' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                                                    >ENDOSAR TERCERO</button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleUpdatePaymentLine(line.id, 'type', 'cheque_own')}
                                                                                        className={`px-3 py-1 text-[9px] font-black rounded-md transition-all ${line.type === 'cheque_own' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                                                    >EMITIR PROPIO</button>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {line.type === 'cheque_third' && type === 'payment_out' ? (
                                                                            <div className="space-y-2">
                                                                                <label className="block text-[9px] font-bold text-slate-500 uppercase px-1">Seleccionar cheque en cartera</label>
                                                                                <select
                                                                                    required
                                                                                    value={line.chequeId}
                                                                                    onChange={e => handleUpdatePaymentLine(line.id, 'chequeId', e.target.value)}
                                                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border-2 border-indigo-500/20 rounded-lg text-slate-900 dark:text-slate-100 font-bold focus:border-indigo-500"
                                                                                >
                                                                                    <option value="">-- Lista de Cheques Disponibles --</option>
                                                                                    {cheques.filter(c => c.type === 'third_party' && c.status === 'en_cartera').map(chk => (
                                                                                        <option key={chk.id} value={chk.id}>#{chk.number} | {chk.bankInfo} | ${chk.amount.toLocaleString()}</option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                                <div className="space-y-1">
                                                                                    <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Número</label>
                                                                                    <input required type="text" placeholder="00000000" value={line.chequeNumber || ''} onChange={e => handleUpdatePaymentLine(line.id, 'chequeNumber', e.target.value)} className="w-full px-3 py-2 text-sm border-2 border-slate-200 dark:border-slate-800 rounded-lg focus:border-indigo-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-bold" />
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Banco</label>
                                                                                    <input
                                                                                        required
                                                                                        type="text"
                                                                                        list="banks-list"
                                                                                        placeholder="Ej: Banco Nación"
                                                                                        value={line.type === 'cheque_own' ? (selectedAccount?.name || line.chequeBank) : (line.chequeBank || '')}
                                                                                        onChange={e => handleUpdatePaymentLine(line.id, 'chequeBank', e.target.value)}
                                                                                        readOnly={line.type === 'cheque_own'}
                                                                                        className={`w-full px-3 py-2 text-sm border-2 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-bold ${line.type === 'cheque_own' ? 'border-slate-100 dark:border-slate-900 opacity-80' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500'}`}
                                                                                    />
                                                                                </div>

                                                                                <div className="space-y-1">
                                                                                    <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Titular / Endosante</label>
                                                                                    <input required type="text" placeholder="Nombre completo" value={line.chequeHolder || ''} onChange={e => handleUpdatePaymentLine(line.id, 'chequeHolder', e.target.value)} className="w-full px-3 py-2 text-sm border-2 border-slate-200 dark:border-slate-800 rounded-lg focus:border-indigo-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-bold" />
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Fecha Emisión</label>
                                                                                    <input required type="date" value={line.chequeIssueDate || ''} onChange={e => handleUpdatePaymentLine(line.id, 'chequeIssueDate', e.target.value)} className="w-full px-3 py-2 text-sm border-2 border-slate-200 dark:border-slate-800 rounded-lg focus:border-indigo-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-bold" />
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Fecha Pago / Venc.</label>
                                                                                    <input required type="date" value={line.chequeDueDate || ''} onChange={e => handleUpdatePaymentLine(line.id, 'chequeDueDate', e.target.value)} className="w-full px-3 py-2 text-sm border-2 border-slate-200 dark:border-slate-800 rounded-lg focus:border-indigo-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-bold" />
                                                                                </div>

                                                                                <div className="flex items-center gap-3 pt-5">
                                                                                    <input type="checkbox" id={`echeq-${line.id}`} checked={line.isECheq} onChange={e => handleUpdatePaymentLine(line.id, 'isECheq', e.target.checked)} className="w-5 h-5 rounded-md accent-indigo-600 border-2 border-slate-300 pointer-cursor" />
                                                                                    <label htmlFor={`echeq-${line.id}`} className="text-xs font-black text-indigo-700 dark:text-indigo-400 select-none cursor-pointer">ES E-CHEQ</label>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center text-white border-t border-emerald-500 shadow-inner">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase opacity-80 tracking-widest">Total de la Transacción</span>
                                                <span className="text-xs opacity-60 italic leading-none">Suma de todos los medios seleccionados</span>
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-sm font-bold opacity-80">{currency === 'USD_DIVISA' || currency === 'USD_BILLETE' ? 'U$D' : 'ARS $'}</span>
                                                <span className="text-3xl font-black tabular-nums tracking-tighter">{totalPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {/* TC Provisional para Pago a Cuenta en ARS */}
                                {showProvisionalTC && (
                                    <div className="md:col-span-2 mt-2 pt-4 border-t border-indigo-200 dark:border-indigo-800">
                                        <label className="block text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-2">
                                            TC Provisional del día (ARS/$)
                                            <span className="text-[10px] font-black bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200">Se usará al Vincular</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium">$</span>
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={provisionalTC}
                                                onChange={e => setProvisionalTC(e.target.value)}
                                                className="w-full pl-8 pr-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-300 dark:border-indigo-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-bold"
                                                placeholder="Ej: 1050.00"
                                            />
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-2">
                                            <p className="text-xs text-indigo-500 italic flex-1">
                                                Registrá el TC BNA del día. Se usará como valor sugerido al imputar este pago después. Podés modificarlo al momento de vincular.
                                            </p>
                                            {fetchedRates.divisa > 0 && (
                                                <div className="flex gap-1 shrink-0">
                                                    <button type="button" onClick={() => setProvisionalTC(fetchedRates.divisa.toString())} className="text-[10px] px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-700 font-bold hover:bg-blue-200 transition-colors">
                                                        BNA Divisa ${fetchedRates.divisa.toLocaleString('es-AR')}
                                                    </button>
                                                    <button type="button" onClick={() => setProvisionalTC(fetchedRates.billete.toString())} className="text-[10px] px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-700 font-bold hover:bg-emerald-200 transition-colors">
                                                        BNA Billete ${fetchedRates.billete.toLocaleString('es-AR')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Exchange Rate Logic - also show for ARS payments settling USD invoices */}
                                {(currency !== 'ARS' || hasCrossCurrencyInvoices) && (
                                    <div className={`md:col-span-2 mt-2 pt-4 border-t ${hasCrossCurrencyInvoices && currency === 'ARS' ? 'border-amber-200 dark:border-amber-800' : 'border-slate-200 dark:border-slate-700'}`}>
                                        <label className={`block text-sm font-bold mb-1 ${hasCrossCurrencyInvoices && currency === 'ARS' ? 'text-amber-700 dark:text-amber-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                            Tipo de Cambio Aplicado (ARS/$) *
                                            {hasCrossCurrencyInvoices && currency === 'ARS' && (
                                                <span className="ml-2 text-[10px] font-black bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200">Se descuenta del saldo USD</span>
                                            )}
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium">$</span>
                                            </div>
                                            <input
                                                required
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={exchangeRate}
                                                onChange={e => setExchangeRate(e.target.value)}
                                                className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 text-slate-900 dark:text-slate-100 font-bold ${hasCrossCurrencyInvoices && currency === 'ARS'
                                                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 focus:ring-amber-500'
                                                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:ring-emerald-500'
                                                    }`}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        {hasCrossCurrencyInvoices && currency === 'ARS' && parseFloat(exchangeRate) > 0 && totalPaymentAmount > 0 && (
                                            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                                <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                                    💱 $ {totalPaymentAmount.toLocaleString('es-AR')} ARS ÷ {parseFloat(exchangeRate).toLocaleString('es-AR')} = <span className="text-emerald-700 dark:text-emerald-400">U$D {(totalPaymentAmount / parseFloat(exchangeRate)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span> aplicados a saldo USD
                                                </p>
                                            </div>
                                        )}
                                        <p className="text-xs text-indigo-500 mt-1 italic">
                                            {hasCrossCurrencyInvoices && currency === 'ARS'
                                                ? 'Los pesos pagados se convierten a USD a este TC y reducen el saldo en dólares.'
                                                : 'Se usará este valor para calcular la equivalencia entre monedas en este comprobante.'}
                                        </p>
                                    </div>
                                )}


                            </div>

                            <div className={`md:col-span-2 ${type === 'invoice_in' ? 'grid grid-cols-1 md:grid-cols-2 gap-5' : ''}`}>
                                <div className={type === 'invoice_in' ? "md:col-span-1" : "md:col-span-2"}>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Concepto General / Observaciones</label>
                                    <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-950 dark:text-slate-100 resize-none font-medium" placeholder="Motivo general de la transacción..."></textarea>
                                </div>

                                {type === 'invoice_in' && (
                                    <div className="md:col-span-1 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                                        <label className="block text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-1 flex items-center">
                                            Pago por reintegro
                                        </label>
                                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-2">
                                            Opcional. Selecciona si un socio/empleado de nuestro equipo, o un tercero lo pagó.
                                        </p>
                                        <select value={paidByThirdPartyId} onChange={e => {
                                            if (e.target.value === 'new_partner') {
                                                setNewEntitySubtype('partner_employee');
                                                setIsCreatingEntity(true);
                                                setPaidByThirdPartyId('');
                                            } else if (e.target.value === 'new_third_party') {
                                                setNewEntitySubtype('third_party');
                                                setIsCreatingEntity(true);
                                                setPaidByThirdPartyId('');
                                            } else {
                                                setPaidByThirdPartyId(e.target.value);
                                            }
                                        }} className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 appearance-none">
                                            <option value="">-- No (Paga o Pagará Agrovista) --</option>
                                            <optgroup label="Socio / Empleado Agrovista">
                                                {entities.filter(e => e.subtype === 'partner_employee').map(e => (
                                                    <option key={e.id} value={e.id}>Socio/Empleado: {e.name}</option>
                                                ))}
                                                <option value="new_partner" className="font-bold text-indigo-600 bg-indigo-50">+ Dar de alta Socio / Empleado...</option>
                                            </optgroup>
                                            <optgroup label="Terceros">
                                                {entities.filter(e => e.subtype === 'third_party').map(e => (
                                                    <option key={e.id} value={e.id}>Tercero: {e.name}</option>
                                                ))}
                                                <option value="new_third_party" className="font-bold text-indigo-600 bg-indigo-50">+ Dar de alta Tercero...</option>
                                            </optgroup>
                                            <optgroup label="Otros Proveedores">
                                                {entities.filter(e => !e.subtype && (e.type === 'supplier' || e.type === 'both')).map(e => (
                                                    <option key={e.id} value={e.id}>Prov: {e.name}</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </div>
                                )}

                                {type === 'invoice_in' && (
                                    <div className="md:col-span-1 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30 flex items-center justify-between">
                                        <div className="pr-4">
                                            <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                                                <Package className="w-4 h-4" /> ¿Ingresar a Stock?
                                            </h4>
                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium leading-tight">
                                                Los productos seleccionados se agregarán al inventario físico al confirmar la compra.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShouldAddToInventory(!shouldAddToInventory)}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${shouldAddToInventory ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${shouldAddToInventory ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Invoice Items Builder */}
                        {isInvoice && (
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mt-6">
                                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Ítems a Facturar</h3>
                                    <button type="button" onClick={handleAddItem} className="text-xs flex items-center gap-1 bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors">
                                        <Plus className="w-3 h-3" /> Agregar Ítem
                                    </button>
                                </div>
                                <div className="p-4 gap-4 flex flex-col bg-slate-50 dark:bg-slate-900/50">
                                    {items.length === 0 ? (
                                        <p className="text-slate-500 text-sm text-center py-4">No hay ítems cargados. Haz clic en "Agregar Ítem".</p>
                                    ) : (
                                        items.map((item) => (
                                            <div key={item.id} className="grid grid-cols-12 gap-3 items-end bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <div className="col-span-12 md:col-span-4">
                                                    <label className="block text-xs text-slate-500 mb-1">Producto / Servicio</label>
                                                    <div className="flex gap-2">
                                                        <select
                                                            value={item.inventoryItemId || ''}
                                                            onChange={e => handleUpdateItem(item.id, 'productId', e.target.value)}
                                                            className="w-1/3 px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                                                        >
                                                            <option value="">(Manual)</option>
                                                            {products.map(p => (
                                                                <option key={p.id} value={p.id}>{p.name}</option>
                                                            ))}
                                                        </select>
                                                        <input
                                                            required
                                                            type="text"
                                                            value={item.description}
                                                            onChange={e => handleUpdateItem(item.id, 'description', e.target.value)}
                                                            className="flex-1 px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                                                            placeholder="Descripción manual..."
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-4 md:col-span-2">
                                                    <label className="block text-xs text-slate-500 mb-1">Cantidad</label>
                                                    <div className="flex items-center gap-1">
                                                        <input required type="number" min="0.01" step="0.01" value={item.quantity || ''} onChange={e => handleUpdateItem(item.id, 'quantity', e.target.value)} className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-slate-100" placeholder="0" />
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">{products.find(p => p.id === item.inventoryItemId)?.unit || ''}</span>
                                                    </div>
                                                </div>
                                                <div className="col-span-4 md:col-span-2">
                                                    <label className="block text-xs text-slate-500 mb-1">P. Unit.</label>
                                                    <input required type="number" min="0" step="0.01" value={item.unitPrice || ''} onChange={e => handleUpdateItem(item.id, 'unitPrice', e.target.value)} className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-slate-100" placeholder="0.00" />
                                                </div>
                                                <div className="col-span-4 md:col-span-1 flex flex-col justify-end">
                                                    <label className="block text-xs text-slate-500 mb-1">% IVA</label>
                                                    <select value={item.ivaPercentage} onChange={e => handleUpdateItem(item.id, 'ivaPercentage', e.target.value)} className="w-full px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-slate-100">
                                                        <option value={0}>0%</option>
                                                        <option value={10.5}>10.5%</option>
                                                        <option value={21}>21%</option>
                                                        <option value={27}>27%</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-10 md:col-span-2 flex flex-col justify-end">
                                                    <label className="block text-xs text-slate-500 mb-1">Subtotal Bruto</label>
                                                    <div className="px-3 py-1.5 text-sm font-semibold bg-slate-100 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 truncate">
                                                        ${(item.subtotal || 0).toLocaleString()}
                                                    </div>
                                                </div>
                                                <div className="col-span-2 md:col-span-1 flex justify-end pb-1">
                                                    <button type="button" onClick={() => handleRemoveItem(item.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Taxes Builder */}
                        {isInvoice && (
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mt-6">
                                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Percepciones, Retenciones y Tasas</h3>
                                    <button type="button" onClick={handleAddTax} className="text-xs flex items-center gap-1 bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors">
                                        <Plus className="w-3 h-3" /> Agregar Tributo
                                    </button>
                                </div>
                                <div className="p-4 gap-4 flex flex-col bg-slate-50 dark:bg-slate-900/50">
                                    {taxes.length === 0 ? (
                                        <p className="text-slate-500 text-sm text-center py-2">Sin tributos adicionales.</p>
                                    ) : (
                                        taxes.map((tax) => (
                                            <div key={tax.id} className="grid grid-cols-12 gap-3 items-end bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <div className="col-span-12 md:col-span-5">
                                                    <label className="block text-xs text-slate-500 mb-1">Tipo de Tributo</label>
                                                    <select value={tax.type} onChange={e => handleUpdateTax(tax.id, 'type', e.target.value)} className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-slate-100">
                                                        <option value="perception_iibb">Percepción IIBB</option>
                                                        <option value="perception_iva">Percepción IVA</option>
                                                        <option value="perception_ganancias">Percepción Ganancias</option>
                                                        <option value="retention_iibb">Retención IIBB</option>
                                                        <option value="retention_ganancias">Retención Ganancias</option>
                                                        <option value="municipal_tax">Tasa Municipal</option>
                                                        <option value="other">Otro</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-8 md:col-span-4">
                                                    <label className="block text-xs text-slate-500 mb-1">Nombre / Detalle (Opcional)</label>
                                                    <input type="text" value={tax.name} onChange={e => handleUpdateTax(tax.id, 'name', e.target.value)} className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-slate-100" placeholder="Ej: Prov. de Bs As" />
                                                </div>
                                                <div className="col-span-4 md:col-span-2">
                                                    <label className="block text-xs text-slate-500 mb-1">Importe</label>
                                                    <input required type="number" min="0" step="0.01" value={tax.amount || ''} onChange={e => handleUpdateTax(tax.id, 'amount', e.target.value)} className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-slate-100" placeholder="0.00" />
                                                </div>
                                                <div className="col-span-12 md:col-span-1 flex justify-end pb-1">
                                                    <button type="button" onClick={() => handleRemoveTax(tax.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Totals Summary */}
                        {isInvoice && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-xl border border-emerald-100 dark:border-emerald-900/50 mt-4">
                                <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-4 uppercase tracking-wider">Resumen de Comprobante</h3>
                                <div className="space-y-2 text-sm text-emerald-900 dark:text-emerald-300">
                                    <div className="flex justify-between items-center">
                                        <span>Subtotal Neto:</span>
                                        <span className="font-semibold">${currentSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Total IVA:</span>
                                        <span className="font-semibold">${currentIvaTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-emerald-200 dark:border-emerald-800/50 pb-2">
                                        <span>Tributos Adicionales:</span>
                                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                                            + ${currentTaxesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 text-base">
                                        <span className="font-bold">TOTAL BRUTO:</span>
                                        <span className="font-bold text-lg">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                    </form>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-end gap-3 rounded-b-2xl shrink-0">
                    {editingTransactionId && (
                        <button
                            type="button"
                            onClick={() => {
                                deleteTransaction(editingTransactionId);
                                onClose();
                            }}
                            className="mr-auto px-5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:hover:bg-rose-900/30 dark:text-rose-400 text-sm font-semibold rounded-lg transition-colors flex items-center"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar Comprobante
                        </button>
                    )}
                    <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors">
                        Cancelar
                    </button>
                    <button type="submit" form="new-tx-form" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center">
                        <Save className="w-4 h-4 mr-2" />
                        {editingTransactionId ? 'Actualizar Transacción' : 'Guardar Transacción'}
                    </button>
                </div>
            </div>

            {isCreatingEntity && (
                <NewEntityModal
                    initialType={newEntitySubtype ? 'supplier' : undefined}
                    initialSubtype={newEntitySubtype}
                    onClose={() => {
                        setIsCreatingEntity(false);
                        setNewEntitySubtype(undefined);
                    }}
                    onSuccess={(newId) => {
                        if (newEntitySubtype) {
                            setPaidByThirdPartyId(newId);
                        } else {
                            setEntityId(newId);
                        }
                        setIsCreatingEntity(false);
                        setNewEntitySubtype(undefined);
                    }}
                />
            )}

            {/* Shared Banks Datalist */}
            <datalist id="banks-list">
                {ARGENTINE_BANKS.map(bank => (
                    <option key={bank} value={bank} />
                ))}
            </datalist>
            {isHistoryOpen && editingTransactionId && (
                <HistoryModal 
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                    entityId={editingTransactionId}
                    entityTitle={`Comprobante ${documentNumber}`}
                />
            )}
        </div>
    );
}

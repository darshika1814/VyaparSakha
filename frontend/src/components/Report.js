import React, { useCallback, useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';

const yearText = (year) => `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
const money = (n) => Number(n).toLocaleString('en-IN');
const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });

function savePdf(report, shopName) {
    const pdf = new jsPDF();

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(shopName || '', 14, 16);
    pdf.setFontSize(13);
    pdf.text(`Yearly Report - Financial Year ${report.financialYear}`, 14, 25);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Period: ${day(report.from)} to ${day(report.to)}`, 14, 31);
    pdf.text(
        `Total Credit: ${money(report.totals.credit)}    Total Debit: ${money(report.totals.debit)}    Balance: ${money(report.totals.balance)}`,
        14,
        37
    );

    pdf.autoTable({
        head: [['Sr No', 'Customer', 'Mobile', 'City', 'Credit', 'Debit', 'Balance']],
        body: report.customers.map((c, i) => [
            i + 1, c.name, c.mobileno, c.address, money(c.credit), money(c.debit), money(c.balance)
        ]),
        foot: [['', 'Total', '', '', money(report.totals.credit), money(report.totals.debit), money(report.totals.balance)]],
        startY: 43,
        theme: 'grid',
        styles: { fontSize: 10, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
        footStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0] }
    });

    pdf.save(`yearly_report_${report.financialYear}.pdf`);
}

export default function Report() {
    const { shopkeeper } = useAuth();
    // null = server default (the year that just closed).
    const [fy, setFy] = useState(null);
    const [report, setReport] = useState(null);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setError('');
        try {
            const response = await api.get('/trans/report', {
                params: fy ? { fy } : {}
            });
            setReport(response.data);
        } catch (err) {
            setError(errorMessage(err, 'Unable to load the report.'));
        }
    }, [fy]);

    useEffect(() => {
        load();
    }, [load]);

    const years = report
        ? Array.from({ length: 6 }, (_, i) => report.currentFy - i)
        : [];

    return (
        <div className="container my-3">
            <h2 className="text-center" style={{ color: '#333' }}>--- Yearly Report ---</h2>
            <p className="text-center text-muted">
                Credit, debit and balance of every customer for one financial year (1 April to 31 March).
                Balances restart from zero each 1 April.
            </p>

            <div className="d-flex justify-content-center align-items-center my-3">
                <label htmlFor="reportFy" className="me-2 fw-bold">Financial year</label>
                <select
                    id="reportFy"
                    className="form-select w-auto"
                    value={report ? report.fy : ''}
                    onChange={(e) => setFy(Number(e.target.value))}
                    disabled={!report}
                >
                    {years.map((year) => (
                        <option key={year} value={year}>
                            {yearText(year)}
                            {year === report.currentFy ? ' (current, still open)' : ''}
                        </option>
                    ))}
                </select>
                <button
                    className="btn btn-primary ms-3"
                    disabled={!report || report.customers.length === 0}
                    onClick={() => savePdf(report, shopkeeper?.shopName)}
                >
                    Download PDF
                </button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {report && (
                <>
                    <div className="d-flex flex-wrap justify-content-around border rounded p-3 mb-3">
                        <h5>Credit ~ जमा: {money(report.totals.credit)}</h5>
                        <h5>Debit ~ नावे: {money(report.totals.debit)}</h5>
                        <h5 style={{ color: report.totals.balance >= 0 ? 'green' : 'red' }}>
                            Balance: {money(report.totals.balance)}
                        </h5>
                    </div>

                    {report.customers.length === 0 ? (
                        <p className="text-center">No transactions in {report.financialYear}.</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-bordered align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>#</th>
                                        <th>Customer</th>
                                        <th>Mobile</th>
                                        <th>City</th>
                                        <th className="text-end">Credit</th>
                                        <th className="text-end">Debit</th>
                                        <th className="text-end">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.customers.map((c, i) => (
                                        <tr key={c.customerId}>
                                            <td>{i + 1}</td>
                                            <td>{c.name}</td>
                                            <td>{c.mobileno}</td>
                                            <td>{c.address}</td>
                                            <td className="text-end">{money(c.credit)}</td>
                                            <td className="text-end">{money(c.debit)}</td>
                                            <td className="text-end">{money(c.balance)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

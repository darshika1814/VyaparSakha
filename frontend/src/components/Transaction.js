import React, { useEffect, useState } from 'react';
import Transview from './Transview';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function set_date(date)
{
    const formattedDate = date.substring(0, 10);

    // Split the date into day, month, and year
    const [year, month, day] = formattedDate.split("-");

    // Reverse the order and join them back
    const reversedDate = `${day}-${month}-${year}`;

    return reversedDate;
}

function save_pdf(name,transactions,balance,shopName) {
    const yearLabel = transactions.financialYear;
    const pdf = new jsPDF();

    pdf.setProperties({
        title: "Balance Report"
    });

    pdf.setFont('helvetica', 'bold');
    pdf.text(shopName || '', 5, 9);
    pdf.setFontSize(15);
    pdf.text('Accounting Software',150,6);
    pdf.text(`Balance Report ${yearLabel ? `FY ${yearLabel}` : ''}`, 150, 12);

    pdf.setLineWidth(1);
    pdf.line(0, 14, 260, 14);

    pdf.text(`To: ${name}`,5,23)
    pdf.text(`BALANCE: ${balance}`,5,30)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('This is a system-generated report, so in the case ',130,22);
    pdf.text('of any issue, neither the company nor we are ',130,26);
    pdf.text('responsibe.',130,30)

    pdf.line(0,35,260,35)

    // Define the headers and the data for the table
    const headers = [['Sr No', 'Date', 'Description', 'Type', 'Amount']];
    const tableData = transactions.transactions.map((item, index) => [
        index + 1,
        set_date(item.date),
        item.description,
        item.type,
        item.amount
    ]);

    // Add the table to the PDF
    pdf.autoTable({
        head: headers,
        body: tableData,
        startY: 50,  // Y position where the table will start
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 3,
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
      },
      headStyles: {
          fillColor: [200, 200, 200],
          textColor: [0, 0, 0],
          fontSize: 12,
      },
      bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 10,
      },
      columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 30 },
          2: { cellWidth: 90 },
          3: { cellWidth: 20 },
          4: { cellWidth: 30 },
      },
      margin: { top: 20, right: 10, bottom: 10, left: 10 },
      showHead: 'everyPage'
    });

    pdf.save('balance_report.pdf');
}


export default function Transaction() {
    const [transaction, setTransaction] = useState(null);
    // null means the current financial year (1 April - 31 March).
    const [fy, setFy] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const { shopkeeper } = useAuth();
    const name = localStorage.getItem('name');
    const customerId = localStorage.getItem('customerId');

    const getTransaction = async () => {
        try {
            const response = await api.get('/trans/getbyUser', {
                params: { customerId, ...(fy ? { fy } : {}) }
            });
            setTransaction(response.data);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setErrorMessage('Unable to load transactions. Please try again.');
        }
    };

    // The server looks up the customer's number and balance itself.
    const message = async () => {
        try {
            const response = await api.post('/sms/send-sms', { customerId });
            alert(response.data.message || 'Reminder SMS sent successfully.');
        } catch (error) {
            console.error('SMS error:', error);
            alert(
                error.response?.data?.message ||
                'Unable to send the reminder SMS. Please try again.'
            );
        }
    };

    const addTransaction = async (amount, description, type) => {
        setErrorMessage('');
        setSuccessMessage('');

        try {
            let imageUrls = [];

            // Upload bill images first, if any were selected.
            if (selectedFiles.length > 0) {
                const formData = new FormData();

                for (let i = 0; i < selectedFiles.length; i++) {
                    formData.append('billimage', selectedFiles[i]);
                }

                const uploadResponse = await api.post(
                    '/uploads/images',
                    formData
                );

                imageUrls = uploadResponse.data;
            }

            // Create the transaction.
            const response = await api.post('/trans/createTransaction', {
                customerId,
                amount,
                description,
                type,
                img: imageUrls
            });

            const responseData = response.data;

            setSuccessMessage(
                responseData.message ||
                'Transaction added successfully.'
            );

            console.log('Transaction created:', responseData);

            // Refresh the transaction list after a successful creation.
            await getTransaction();

            // Clear the form and selected files.
            setNote({
                amount: 0,
                description: '',
                type: ''
            });
            setSelectedFiles([]);

            // Reload after showing the success message.
            // Remove this reload if you prefer to keep the form state.
            window.location.reload();

        } catch (error) {
            console.error('Transaction creation error:', error);

            if (error.response) {
                setErrorMessage(
                    error.response.data?.message ||
                    error.response.data?.error ||
                    'Image upload failed. Please try again.'
                );
            } else {
                setErrorMessage(
                    'Unable to connect to the server. Please try again.'
                );
            }
        }
    };

    useEffect(() => {
        getTransaction();
    }, [name, fy]);

    const readOnly = Boolean(transaction?.readOnly);
    const yearOptions = transaction
        ? Array.from({ length: 5 }, (_, i) => transaction.currentFy - i)
        : [];
    const yearText = (year) => `${year}-${String((year + 1) % 100).padStart(2, '0')}`;

    const [note, setNote] = useState({
        amount: 0,
        description: '',
        type: ''
    });

    const onChange = (e) => {
        setNote({
            ...note,
            [e.target.name]: e.target.value
        });
    };

    const onFileChange = (e) => {
        setSelectedFiles(Array.from(e.target.files || []));
    };

    return (
        <div className="center">
            {!readOnly && (
            <div className="container border rounded my-2">
                <h1 style={{ fontFamily: 'Recursive' }}>
                    Add a Transaction for {name}
                </h1>

                {errorMessage && (
                    <div className="alert alert-danger" role="alert">
                        {errorMessage}
                    </div>
                )}

                {successMessage && (
                    <div className="alert alert-success" role="alert">
                        {successMessage}
                    </div>
                )}

                <form
                    className="container my-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        addTransaction(
                            note.amount,
                            note.description,
                            note.type
                        );
                    }}
                >
                    <div className="mb-3">
                        <label htmlFor="amount">Amount</label>
                        <input
                            type="number"
                            min="0.01"
                            step="any"
                            className="form-control"
                            id="amount"
                            name="amount"
                            placeholder="Enter amount"
                            autoComplete="off"
                            value={note.amount === 0 ? '' : note.amount}
                            onChange={onChange}
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label htmlFor="description">Description</label>
                        <input
                            type="text"
                            className="form-control"
                            id="description"
                            name="description"
                            placeholder="Give description"
                            autoComplete="off"
                            value={note.description}
                            onChange={onChange}
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label>Type</label>
                        <div>
                            <div className="form-check form-check-inline">
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    id="debit"
                                    name="type"
                                    value="debit"
                                    checked={note.type === 'debit'}
                                    onChange={onChange}
                                    required
                                />
                                <label
                                    className="form-check-label"
                                    htmlFor="debit"
                                >
                                    Debit ~ नावे
                                </label>
                            </div>

                            <div className="form-check form-check-inline">
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    id="credit"
                                    name="type"
                                    value="credit"
                                    checked={note.type === 'credit'}
                                    onChange={onChange}
                                    required
                                />
                                <label
                                    className="form-check-label"
                                    htmlFor="credit"
                                >
                                    Credit ~ जमा
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="d-flex flex-column align-items-start">
                        <input
                            type="file"
                            name="billimage"
                            multiple
                            accept="image/*"
                            onChange={onFileChange}
                            className="mb-2"
                        />

                        <button type="submit" className="btn btn-primary my-2">
                            Add a Transaction
                        </button>
                    </div>
                </form>
            </div>
            )}

            <h3 className="mx-3 my-2 d-flex justify-content-center align-items-center">
                -- Transactions for: {name} --
            </h3>

            {transaction && (
                <div className="d-flex justify-content-center align-items-center my-2">
                    <label htmlFor="fy" className="me-2 fw-bold">Financial year</label>
                    <select
                        id="fy"
                        className="form-select w-auto"
                        value={transaction.fy}
                        onChange={(e) => {
                            const year = Number(e.target.value);
                            setFy(year === transaction.currentFy ? null : year);
                        }}
                    >
                        {yearOptions.map((year) => (
                            <option key={year} value={year}>
                                {yearText(year)}{year === transaction.currentFy ? ' (current)' : ''}
                            </option>
                        ))}
                    </select>
                    <span className="ms-3 text-muted">
                        Totals restart on 1 April each year.
                    </span>
                </div>
            )}

            {readOnly && (
                <div className="alert alert-secondary container text-center" role="alert">
                    {transaction.financialYear} is a closed year. Its records are view-only.
                </div>
            )}

            <div className="d-flex justify-content-center align-items-center">
                <button
                    onClick={() =>
                        save_pdf(name, transaction, transaction?.balance, shopkeeper?.shopName)
                    }
                    className="btn btn-primary my-2 mx-2"
                    disabled={!transaction}
                >
                    Generate Balance Report
                </button>

                <button
                    onClick={message}
                    className="btn btn-primary my-2"
                    disabled={!transaction || readOnly}
                >
                    Reminder SMS
                </button>
            </div>

            {transaction && (
                <>
                    <h3
                        className="mx-3 my-3 d-flex justify-content-center align-items-center border rounded"
                        style={{
                            color: transaction.balance > 0 ? 'green' : 'red'
                        }}
                    >
                        @--- Balance: {transaction.balance} ---@
                    </h3>

                    <div className="container d-flex justify-content-between align-items-center">
                        <h3 className="mx-3">
                            Debit ~ नावे : {transaction.debit}
                        </h3>
                        <h3 className="mx-3">
                            Credit ~ जमा : {transaction.credit}
                        </h3>
                    </div>

                    <div className="view">
                        {Array.isArray(transaction.transactions) &&
                            transaction.transactions.map((trans) => (
                                <Transview
                                    key={trans._id}
                                    id={trans._id}
                                    amount={trans.amount}
                                    description={trans.description}
                                    type={trans.type}
                                    date={trans.date}
                                    images={trans.images}
                                    readOnly={readOnly}
                                />
                            ))}
                    </div>
                </>
            )}
        </div>
    );
}



import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function Transview(props) {
    const [showModal, setShowModal] = useState(false);
    const [amount, setAmount] = useState(props.amount);
    const [description, setDescription] = useState(props.description);
    const [type, setType] = useState(props.type);
    const [date, setDate] = useState(props.date.substring(0, 10));
    const [error, setError] = useState('');

    const leftoverPart = props.date.substring(10);
    const baseUrl = process.env.REACT_APP_BASE_URL;

    const deleteTransaction = async (id) => {
        if (!window.confirm('Are you sure you want to delete the transaction?')) {
            return;
        }

        try {
            const imageUrls = props.images || [];

            // Delete the transaction first.
            const response = await axios.delete(
                `${baseUrl}/trans/deletetrans/${id}`
            );

            console.log('Transaction deleted:', response.data);

            // Delete associated Cloudinary images, if any.
            if (imageUrls.length > 0) {
                try {
                    const imageResponse = await axios.delete(
                        `${baseUrl}/uploads/deleteimage`,
                        {
                            data: { imageUrls },
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    console.log('Images deleted:', imageResponse.data);
                } catch (imageError) {
                    console.error(
                        'Transaction deleted, but image deletion failed:',
                        imageError
                    );
                }
            }

            window.location.reload();
        } catch (error) {
            console.error('Error deleting transaction:', error);
            window.alert('Unable to delete the transaction.');
        }
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();

        try {
            const fullDate = date + leftoverPart;

            const response = await axios.put(
                `${baseUrl}/trans/updatetransaction/${props.id}`,
                {
                    amount,
                    description,
                    type,
                    date: fullDate
                }
            );

            console.log('Transaction updated:', response.data);
            setShowModal(false);
            window.location.reload();
        } catch (error) {
            console.error('Error updating transaction:', error);
            setError('Unable to update the transaction.');
        }
    };

    const handleRadioChange = (e) => {
        setType(e.target.value);
    };

    const formattedDate = props.date.substring(0, 10);
    const [year, month, day] = formattedDate.split('-');
    const reversedDate = `${day}-${month}-${year}`;

    return (
        <div>
            <div className="container-fluid">
                <div className="row">
                    <div className="col">
                        <div className="card my-2">
                            <div className="card-body">
                                <h5 className="card-title">
                                    Amount: {props.amount}
                                </h5>

                                <p className="card-text">
                                    Description: {props.description}
                                </p>

                                <p className="card-text">
                                    Type: {props.type} ~{' '}
                                    {props.type === 'debit' ? 'नावे' : 'जमा'}
                                </p>

                                <p className="card-text">
                                    Date: {reversedDate}
                                </p>

                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        setError('');
                                        setShowModal(true);
                                    }}
                                >
                                    Update
                                </button>

                                {/* Pass this transaction's ID in the URL */}
                                <Link
                                    to={`/image?id=${props.id}`}
                                    className="btn btn-primary mx-2"
                                >
                                    View Bills
                                </Link>

                                <button
                                    className="btn btn-primary"
                                    onClick={() => deleteTransaction(props.id)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showModal && (
                <div
                    className="modal d-block"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                >
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Update Transaction
                                </h5>

                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowModal(false)}
                                />
                            </div>

                            <div className="modal-body">
                                {error && (
                                    <div className="alert alert-danger">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleUpdateSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label">
                                            Amount
                                        </label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={amount}
                                            onChange={(e) =>
                                                setAmount(e.target.value)
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">
                                            Description
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={description}
                                            onChange={(e) =>
                                                setDescription(e.target.value)
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <div className="form-check form-check-inline">
                                            <input
                                                className="form-check-input"
                                                type="radio"
                                                id={`credit-${props.id}`}
                                                name={`type-${props.id}`}
                                                value="credit"
                                                checked={type === 'credit'}
                                                onChange={handleRadioChange}
                                            />
                                            <label
                                                className="form-check-label"
                                                htmlFor={`credit-${props.id}`}
                                            >
                                                Credit ~ जमा
                                            </label>
                                        </div>

                                        <div className="form-check form-check-inline">
                                            <input
                                                className="form-check-input"
                                                type="radio"
                                                id={`debit-${props.id}`}
                                                name={`type-${props.id}`}
                                                value="debit"
                                                checked={type === 'debit'}
                                                onChange={handleRadioChange}
                                            />
                                            <label
                                                className="form-check-label"
                                                htmlFor={`debit-${props.id}`}
                                            >
                                                Debit ~ नावे
                                            </label>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">
                                            Date (YYYY-MM-DD)
                                        </label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={date}
                                            onChange={(e) =>
                                                setDate(e.target.value)
                                            }
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                    >
                                        Save Changes
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
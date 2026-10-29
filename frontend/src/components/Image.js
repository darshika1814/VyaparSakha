import React, { useState, useEffect } from 'react';
import api from '../api';

export default function Image() {
    const [photo, setPhoto] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const getImage = async () => {
            // Read the transaction ID from the URL.
            // Example: /image?id=6ae0d17a3b07cac395a39370
            const params = new URLSearchParams(window.location.search);
            const id = params.get('id');

            if (!id) {
                setError(
                    'No transaction selected. Please open the bill from a transaction.'
                );
                setLoading(false);
                return;
            }

            try {
                const response = await api.get(`/trans/gettrans/${id}`);

                const images = response.data?.images;

                if (Array.isArray(images)) {
                    setPhoto(images);
                } else {
                    setPhoto([]);
                }
            } catch (err) {
                console.error(
                    'Error fetching transaction images:',
                    err.response?.data || err.message
                );

                setError('Unable to load bills. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        getImage();
    }, []);

    return (
        <div className="container">
            <div className="row">
                <div className="col-12">
                    {loading ? (
                        <div className="text-center mt-5">
                            <h3>Loading bills...</h3>
                        </div>
                    ) : error ? (
                        <div className="text-center mt-5">
                            <h3>{error}</h3>
                        </div>
                    ) : photo.length === 0 ? (
                        <div className="text-center mt-5">
                            <h3>No bills to show</h3>
                        </div>
                    ) : (
                        <div className="d-flex flex-wrap justify-content-center">
                            {photo.map((src, index) => (
                                <div key={`${src}-${index}`} className="m-2">
                                    <div
                                        style={{
                                            color: 'black',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Page: {index + 1}
                                    </div>

                                    <img
                                        src={src}
                                        alt={`Bill page ${index + 1}`}
                                        className="img-fluid p-2 mx-2 my-1"
                                        style={{
                                            maxWidth: '100%',
                                            height: 'auto'
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
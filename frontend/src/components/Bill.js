import React, { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import Billview from "./Billview";
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';

// Function to generate the PDF
async function save_pdf(customer, products, shop) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  let yPosition = 100;  // Start product table lower on the page
  
  // Store Header (Top Left)
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 99);
  doc.text(shop?.shopName || "", 10, 10); // Store name
  doc.setFontSize(12);
  doc.setTextColor(99, 99, 99);
  const shopLines = [
    shop?.address,
    shop?.mobileno ? `Phone: ${shop.mobileno}` : "",
    shop?.gstin ? `GST IN: ${shop.gstin}` : ""
  ].filter(Boolean);
  shopLines.forEach((line, i) => doc.text(line, 10, 20 + i * 5));

  // Invoice Details (Top Right)
  const invoiceNumber = Math.floor(Math.random() * 1000000); // Generate a random invoice number
  const today = new Date();
  const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Invoice No: ${invoiceNumber}`, 150, 50);
  doc.text(`Date: ${formattedDate}`, 150, 57);

  // Billed To Section (Below Store Details)
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 250);
  doc.text("Billed To:", 10, 50);
  doc.setTextColor(0, 0, 0);
  doc.text(`Name: ${customer.name}`, 10, 57);
  doc.text(`Address: ${customer.address}`, 10, 64);
  doc.text(`Mobile: ${customer.mobile}`, 10, 71);

  // Add more space before starting the product table
  yPosition += 5; // Increase vertical space

  // Product Table Headers
  doc.setFillColor(204, 204, 255);
  doc.rect(10, yPosition, 190, 10, "F"); // Fill with background color
  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text("Sr No", 15, yPosition + 7);
  doc.text("Name", 35, yPosition + 7);
  doc.text("Quantity", 85, yPosition + 7);
  doc.text("Price", 135, yPosition + 7);
  doc.text("Net Amount", 165, yPosition + 7);

  yPosition += 10; // Move down for product rows

  let netTotal = 0;
  products.forEach((p, index) => {
    if (yPosition > pageHeight - 20) { // Check if new page is needed
      doc.addPage();
      yPosition = 10;

      // Table Headers on New Page
      doc.setFillColor(204, 204, 255);
      doc.rect(10, yPosition, 190, 10, "F"); // Fill with background color
      doc.setDrawColor(0, 0, 0);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text("Sr No", 15, yPosition + 7);
      doc.text("Name", 35, yPosition + 7);
      doc.text("Quantity", 85, yPosition + 7);
      doc.text("Price", 135, yPosition + 7);
      doc.text("Net Amount", 165, yPosition + 7);
      yPosition += 10;
    }

    const netAmount = p.quantity * p.price;
    netTotal += netAmount;
    doc.text(`${index + 1}`, 15, yPosition + 7);
    doc.text(p.name, 35, yPosition + 7);
    doc.text(p.quantity.toString(), 90, yPosition + 7);
    doc.text(p.price.toString(), 138, yPosition + 7);
    doc.text(netAmount.toString(), 173, yPosition + 7);
    yPosition += 10;
  });

  // Grand Total Section
  if (yPosition > pageHeight - 20) { // Check if new page is needed for total
    doc.addPage();
    yPosition = 20;
  }

  doc.setFillColor(204, 204, 255); // Background color for total
  doc.rect(10, yPosition + 8, 190, 10, "F"); // Draw the rectangle
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0); // Black text color for total
  doc.text(`Grand Total: ${netTotal}`, 85, yPosition + 15);

  // Save PDF
  doc.save("Bill.pdf");

  // Delete this shopkeeper's invoice items and the saved customer draft.
  try {
    await api.delete('/bill/deleteAll');
  } catch (error) {
    console.error("Error deleting bills:", error);
  }

  localStorage.removeItem("customer");
  window.location.reload();
}



export default function Bill() {
  const { shopkeeper } = useAuth();
  const [customer, setCustomer] = useState(() => {
    const savedCustomer = localStorage.getItem("customer");
    return savedCustomer ? JSON.parse(savedCustomer) : { name: "", mobile: "", address: "" };
  });

  const [item, setItem] = useState({ name: "", quantity: 0, price: 0 });
  const [products, setProducts] = useState([]);

  const calculateEstimatedAmount = () => {
    return products.reduce((total, product) => {
      return total + (product.price * product.quantity);
    }, 0);
  };

  const estimatedAmount = calculateEstimatedAmount();

  const onChangeCustomer = (e) => {
    const updatedCustomer = { ...customer, [e.target.name]: e.target.value };
    setCustomer(updatedCustomer);
    localStorage.setItem("customer", JSON.stringify(updatedCustomer));
  };

  const onChangeItem = (e) => {
    setItem({ ...item, [e.target.name]: e.target.value });
  };

  const getproduct = async ()=>{
    try {
      const product = await api.get('/bill/getproduct');
      setProducts(product.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }

  const handleClick = async(e) => {
    try {
      await api.post('/bill/addproduct',{
        name : item.name, price: item.price, quantity: item.quantity
      });
      setItem({ name: "", quantity: 0, price: 0 });
    } catch (error) {
      window.alert(errorMessage(error, 'Unable to add the item.'));
    }
  };

  useEffect(()=>{
    getproduct()
  },[])

  return (
    <div>
     <div className="container mt-3">
        <div className="row justify-content-center">
          <div className="col-md-10">
            <div className="card p-4 shadow-sm border rounded">
              <div className="card-body">
                <h4 className="card-title text-center mb-4">Customer Details</h4>
                <form className="container">
                  <div className="row">
                    <div className="mb-3 col-md-4">
                      <label htmlFor="customerName" className="form-label">Customer Name</label>
                      <input
                        type="text"
                        className="form-control"
                        id="customerName"
                        name="name"
                        placeholder="Enter Customer Name"
                        autoComplete="off"
                        value={customer.name}
                        onChange={onChangeCustomer}
                      />
                    </div>

                    <div className="mb-3 col-md-4">
                      <label htmlFor="mobile" className="form-label">Mobile Number</label>
                      <input
                        type="text"
                        className="form-control"
                        id="mobile"
                        name="mobile"
                        placeholder="Enter Mobile Number"
                        autoComplete="off"
                        value={customer.mobile}
                        onChange={onChangeCustomer}
                      />
                    </div>

                    <div className="mb-3 col-md-4">
                      <label htmlFor="customerAddress" className="form-label">Customer Address</label>
                      <input
                        type="text"
                        className="form-control"
                        id="customerAddress"
                        name="address"
                        placeholder="Enter Customer Address"
                        autoComplete="off"
                        value={customer.address}
                        onChange={onChangeCustomer}
                      />
                    </div>

                    {/* Display the estimated amount here */}
                  <div className="mb-3 col-md-12">
                    <label htmlFor="estimatedAmount" className="form-label">Estimated Bill Amount</label>
                    <input
                      type="text"
                      className="form-control fw-bold"
                      id="estimatedAmount"
                      name="estimatedAmount"
                      value={`₹ ${estimatedAmount}`}
                      readOnly
                    />
                  </div>

                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>  
        {/* <hr /> */}
      <div className="container mt-4">
        <div className="row justify-content-center">
          <div className="col-md-10">
            <div className="card p-4 shadow-sm border rounded">
              <div className="card-body">
                <h4 className="card-title text-center mb-4">Add a Product</h4>
                <form className="d-flex align-items-center justify-content-between flex-wrap">
                  {/* Product Name Input */}
                  <div className="mb-3 me-3 flex-grow-1">
                    <label htmlFor="productName" className="form-label">Product Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="productName"
                      name="name"
                      placeholder="Enter Name"
                      autoComplete="off"
                      value={item.name}
                      onChange={onChangeItem}
                    />
                  </div>

                  {/* Quantity Input */}
                  <div className="mb-3 me-3 flex-grow-1">
                    <label htmlFor="quantity" className="form-label">Quantity</label>
                    <input
                      type="number"
                      className="form-control"
                      id="quantity"
                      name="quantity"
                      placeholder="Give Quantity"
                      autoComplete="off"
                      value={item.quantity}
                      onChange={onChangeItem}
                    />
                  </div>

                  {/* Price Input */}
                  <div className="mb-3 me-3 flex-grow-1">
                    <label htmlFor="price" className="form-label">Price</label>
                    <input
                      type="number"
                      className="form-control"
                      id="price"
                      name="price"
                      placeholder="Give Price"
                      autoComplete="off"
                      value={item.price}
                      onChange={onChangeItem}
                    />
                  </div>

                  <div className="d-flex mt-3">
                    <button
                      type="submit"
                      className="btn btn-primary me-3"
                      onClick={handleClick}
                    >
                      Add Product
                    </button>

                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => save_pdf(customer, products, shopkeeper)}
                    >
                      Generate Invoice
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <h3 className='mx-3 my-2 d-flex justify-content-center align-items-center'>--- Products ---</h3>
      <div className="user-list">
        {Array.isArray(products) &&
          products.map((p, index) => (
            <Billview key={index} id ={p._id} name={p.name} quantity={p.quantity} price={p.price} />
          ))}
      </div>
    </div>
  );
}

import api, { errorMessage } from '../api';
import React from 'react'
import { Link } from 'react-router-dom';

const User = (props)=> {

    const deleteUser = async (id) => {
      try {
          if (window.confirm('Are you sure you want to delete the user')){
            await api.delete(`/user/deleteUser/${id}`);
            window.location.reload();
          }
        //Please see to reload something.....
      } catch (error) {
        window.alert(errorMessage(error, 'Unable to delete the customer.'));
      }
    };

    // Remember which of this shopkeeper's customers is open. Access is
    // controlled by the shopkeeper's login token, not by this value.
    const setData = (id,name,mobileno)=>{
        localStorage.setItem("customerId",id);
        localStorage.setItem("name",name);
        localStorage.setItem("mob",mobileno);
    }
    

  return (
    <div className="container-fluid">
        <div className="row">
            <div className="col">
                <div className="card my-2">
                    <div className="card-body">
                        <h5 className="card-title">Name: {props.name}</h5>
                        <p className="card-text">Phone No : {props.mobileno}</p>
                        <p className="card-text">City : {props.address}</p>
                        <Link to="/transaction" className="btn btn-primary" onClick={()=>setData(props.id,props.name,props.mobileno)}>Transaction's</Link>
                        <button  className="btn btn-primary mx-2" onClick={()=>deleteUser(props.id)}>Delete</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  )
}
export default User;
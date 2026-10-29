import React,{ useState, useEffect } from 'react'
// import noteContext from '../context/NoteContext';
import  User  from './User';
import api, { errorMessage } from '../api';

export default function Cityaccount() {

    let city = localStorage.getItem("city-name");

    const [user,setUser] = useState([]);
    const [newuser,setNewuser] = useState({name:"",mobileno:"",address:city});

    const addUser = async (name, mobileno, address) => {
    try {
        await api.post('/user/createUser', { name, mobileno, address });
        return true;
    } catch (error) {
        window.alert(errorMessage(error, 'Unable to add the customer.'));
        return false;
    }
    };

    const handleClick = async (e)=>{
        e.preventDefault();
        const added = await addUser(newuser.name,newuser.mobileno,newuser.address);
        if (added) {
            setNewuser({name:"",mobileno:"",address:city});
            e.target.form?.reset();
            await getUser();
        }
    }

    const onChange = (e)=>{
        setNewuser({...newuser,[e.target.name]:e.target.value});
    }

    const getUser = async () => {
        try {
            const response = await api.get('/user/getbycity', { params: { address: city } });
            setUser(response.data);
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    }    

    useEffect(()=>{
        getUser();
    },[city]);

  return (
    <div>
        <div className='container border rounded my-2'>
            <h1 style={{fontFamily:'Recursive'}}>Add a User in {city} Account</h1>
            <form className='container my-3'>
                <div className="mb-3">
                    <label htmlFor="name">Name</label>
                    <input type="text"   className="form-control" id="name" name='name' placeholder="Enter name" autoComplete="off" onChange={onChange}/>
                </div>
                <div className="mb-3">
                    <label htmlFor="mobileno">Mobile-No</label>
                    <input type="number" className="form-control" id="mobileno" name='mobileno' placeholder="Give mobileno" autoComplete="off" onChange={onChange}/>
                </div>
                <button type="submit" className="btn btn-primary" onClick={handleClick}>Add User</button>
            </form>
        </div>
        <h2 className='text-center' style={{ color: '#333' }}>--- User in {city} ---</h2>
        <div className='user-list'>
        {Array.isArray(user) && user.map((person,index) => {
            return <User id={person._id} key={index} name={person.name} mobileno={person.mobileno} address={person.address}></User>
        })}
        </div>
    </div>
  )
}

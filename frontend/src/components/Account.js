import React, { useEffect, useState } from 'react'
import  User  from './User';
import api from '../api';

export default function Account() {

    const [user,Setuser] = useState(null);
    const [searchName, setSearchName] = useState('');

    const getAlluser = async()=>{
        try {
            const response = await api.get('/user/');
            Setuser(response.data);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    }

    const handleSearch = async () => {
        try {
            const response = await api.get('/user/searchuser', { params: { name: searchName } });
            Setuser(response.data);
        } catch (error) {
            console.error('Error searching accounts:', error);
        }
    }

    useEffect(()=>{
        getAlluser();
    },[]);

  return (
    <div>
        <h2 className='text-center' style={{ color: '#333' }}>--- All Accounts in firm ---</h2>
        <div className="input-group mb-3 mx-auto my-3" style={{ maxWidth: '350px' }}>
                <input type="text" className="form-control" placeholder="Search by name" value={searchName} onChange={(e) => setSearchName(e.target.value)}/>
                <button className="btn btn-primary" type="button"  onClick={handleSearch}>Search</button>
        </div>
        <div className='user-list'>
            {Array.isArray(user) && user.map((person) => {
                return <User key={person._id} id={person._id} name={person.name} mobileno={person.mobileno} address={person.address}></User>
            })}
        </div>
    </div>
  )
}
